import {
  getAuditStorageStats,
  logAuditEvent,
  readAuditEvents,
  toAuditCsv,
  type AuditLogEntry,
} from "../../../../_core/audit";
import type { IAuditGateway, AuditWriteInput } from "../../domain/contracts/audit.gateway";

export class FileAuditGateway implements IAuditGateway {
  async write(event: AuditWriteInput): Promise<void> {
    await logAuditEvent(event);
  }

  async read(params?: {
    limit?: number;
    action?: string;
    status?: "success" | "failed" | "blocked";
    actorContains?: string;
  }): Promise<AuditLogEntry[]> {
    return await readAuditEvents(params);
  }

  exportCsv(entries: AuditLogEntry[]): string {
    return toAuditCsv(entries);
  }

  async storageStats() {
    return await getAuditStorageStats();
  }
}
