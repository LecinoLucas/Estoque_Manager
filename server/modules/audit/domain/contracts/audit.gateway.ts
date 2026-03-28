import type { AuditLogEntry, AuditStorageStats } from "../../../../_core/audit";

export type AuditWriteInput = {
  action: string;
  status?: "success" | "failed" | "blocked";
  actor?: {
    id?: number;
    email?: string | null;
    role?: string | null;
    openId?: string | null;
    ip?: string;
  };
  target?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export interface IAuditGateway {
  write(event: AuditWriteInput): Promise<void>;
  read(params?: {
    limit?: number;
    action?: string;
    status?: "success" | "failed" | "blocked";
    actorContains?: string;
  }): Promise<AuditLogEntry[]>;
  exportCsv(entries: AuditLogEntry[]): string;
  storageStats(): Promise<AuditStorageStats>;
}
