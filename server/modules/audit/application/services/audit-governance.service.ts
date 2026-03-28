import { AUTH_AUDIT_ACTION } from "@shared/auth-governance";
import { STOCK_ACTION_PREFIX } from "@shared/stock-governance";
import { clearRateLimitBuckets, getRateLimitSnapshot } from "../../../../_core/trpc";
import type { IAuditGateway } from "../../domain/contracts/audit.gateway";

function getStockUnitsImpact(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) return 0;

  let impact = 0;
  const items = metadata.itens;

  if (Array.isArray(items)) {
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      const before = Number(record.estoqueAntes ?? 0);
      const after = Number(record.estoqueDepois ?? 0);
      if (!Number.isNaN(before) && !Number.isNaN(after)) {
        impact += Math.abs(before - after);
      }
    }
  }

  if (metadata.before && metadata.after && typeof metadata.before === "object" && typeof metadata.after === "object") {
    const before = Number((metadata.before as Record<string, unknown>).quantidade ?? 0);
    const after = Number((metadata.after as Record<string, unknown>).quantidade ?? 0);
    if (!Number.isNaN(before) && !Number.isNaN(after)) {
      impact += Math.abs(before - after);
    }
  }

  const beforeSingle = Number(metadata.estoqueAntes ?? 0);
  const afterSingle = Number(metadata.estoqueDepois ?? 0);
  if (!Number.isNaN(beforeSingle) && !Number.isNaN(afterSingle)) {
    impact += Math.abs(beforeSingle - afterSingle);
  }

  return impact;
}

export class AuditGovernanceService {
  constructor(private readonly auditGateway: IAuditGateway) {}

  async listEvents(input?: {
    limit?: number;
    action?: string;
    status?: "success" | "failed" | "blocked";
    actorContains?: string;
  }) {
    return await this.auditGateway.read({
      limit: input?.limit ?? 100,
      action: input?.action,
      status: input?.status,
      actorContains: input?.actorContains,
    });
  }

  async exportCsv(input?: {
    limit?: number;
    action?: string;
    status?: "success" | "failed" | "blocked";
    actorContains?: string;
  }) {
    const events = await this.auditGateway.read({
      limit: input?.limit ?? 500,
      action: input?.action,
      status: input?.status,
      actorContains: input?.actorContains,
    });

    return {
      filename: `auditoria-${new Date().toISOString().slice(0, 10)}.csv`,
      csv: this.auditGateway.exportCsv(events),
    } as const;
  }

  getRateLimitStats(input?: { scopePrefix?: string; limit?: number }) {
    return getRateLimitSnapshot({
      scopePrefix: input?.scopePrefix,
      limit: input?.limit ?? 100,
    });
  }

  async clearRateLimits(
    actor: { id: number; email: string | null; role: string; openId: string; ip?: string },
    input: { scopePrefix?: string; identityContains?: string; maxDelete: number }
  ) {
    const removed = clearRateLimitBuckets({
      scopePrefix: input.scopePrefix,
      identityContains: input.identityContains,
      maxDelete: input.maxDelete,
    });

    await this.auditGateway.write({
      action: AUTH_AUDIT_ACTION.RATE_LIMIT_CLEAR,
      actor,
      metadata: {
        removed,
        scopePrefix: input.scopePrefix ?? null,
        identityContains: input.identityContains ?? null,
        maxDelete: input.maxDelete,
      },
    });

    return { success: true, removed } as const;
  }

  async stockAnomalies(input?: {
    windowMinutes?: number;
    thresholdEvents?: number;
    limit?: number;
  }) {
    const windowMinutes = input?.windowMinutes ?? 30;
    const thresholdEvents = input?.thresholdEvents ?? 10;
    const limit = input?.limit ?? 10;
    const cutoff = Date.now() - windowMinutes * 60 * 1000;

    const events = await this.auditGateway.read({ limit: 500 });
    const stockEvents = events.filter((event) => {
      if (!event.action.startsWith(STOCK_ACTION_PREFIX)) return false;
      const timestampMs = new Date(event.timestamp).getTime();
      return !Number.isNaN(timestampMs) && timestampMs >= cutoff;
    });

    const grouped = new Map<
      string,
      {
        actor: string;
        ip: string | null;
        totalEvents: number;
        failedEvents: number;
        impactedUnits: number;
        actions: Set<string>;
        firstAt: string;
        lastAt: string;
      }
    >();

    for (const event of stockEvents) {
      const actorLabel =
        event.actor?.email ||
        event.actor?.openId ||
        (event.actor?.id ? `id:${event.actor.id}` : null) ||
        (event.actor?.ip ? `ip:${event.actor.ip}` : null) ||
        "desconhecido";

      const key = `${actorLabel}|${event.actor?.ip ?? "-"}`;
      const current = grouped.get(key) ?? {
        actor: actorLabel,
        ip: event.actor?.ip ?? null,
        totalEvents: 0,
        failedEvents: 0,
        impactedUnits: 0,
        actions: new Set<string>(),
        firstAt: event.timestamp,
        lastAt: event.timestamp,
      };

      current.totalEvents += 1;
      if (event.status === "failed") current.failedEvents += 1;
      current.impactedUnits += getStockUnitsImpact(event.metadata ?? null);
      current.actions.add(event.action);

      if (new Date(event.timestamp).getTime() < new Date(current.firstAt).getTime()) {
        current.firstAt = event.timestamp;
      }
      if (new Date(event.timestamp).getTime() > new Date(current.lastAt).getTime()) {
        current.lastAt = event.timestamp;
      }

      grouped.set(key, current);
    }

    return Array.from(grouped.values())
      .filter((item) => item.totalEvents >= thresholdEvents || item.failedEvents >= 2)
      .map((item) => {
        const highRisk =
          item.totalEvents >= thresholdEvents * 2 || item.failedEvents >= 5 || item.impactedUnits >= 120;
        const mediumRisk =
          !highRisk && (item.totalEvents >= thresholdEvents || item.failedEvents >= 2 || item.impactedUnits >= 60);

        return {
          ...item,
          actions: Array.from(item.actions).sort(),
          riskLevel: highRisk ? "high" : mediumRisk ? "medium" : "low",
        } as const;
      })
      .sort((a, b) => {
        if (a.riskLevel !== b.riskLevel) {
          return a.riskLevel === "high" ? -1 : b.riskLevel === "high" ? 1 : 0;
        }
        if (b.totalEvents !== a.totalEvents) return b.totalEvents - a.totalEvents;
        if (b.failedEvents !== a.failedEvents) return b.failedEvents - a.failedEvents;
        return b.impactedUnits - a.impactedUnits;
      })
      .slice(0, limit);
  }

  async storageStats() {
    return await this.auditGateway.storageStats();
  }
}
