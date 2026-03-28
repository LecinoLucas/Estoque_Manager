import { mkdir, appendFile, readdir, rename, stat, unlink, readFile } from "node:fs/promises";
import path from "node:path";

type AuditActor = {
  id?: number;
  email?: string | null;
  role?: string | null;
  openId?: string | null;
  ip?: string;
};

type AuditEventInput = {
  action: string;
  actor?: AuditActor;
  target?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  status?: "success" | "failed" | "blocked";
};

const AUDIT_LOG_DIR = path.resolve(process.cwd(), ".dev-logs");
const AUDIT_LOG_PATH = path.join(AUDIT_LOG_DIR, "audit.log");
const AUDIT_ARCHIVE_PREFIX = "audit-";
const AUDIT_ARCHIVE_SUFFIX = ".log";
const MAX_FETCH = 500;
const DEFAULT_MAX_SIZE_MB = 5;
const DEFAULT_RETENTION_DAYS = 30;

function resolveAuditMaxSizeBytes() {
  const raw = Number(process.env.AUDIT_MAX_SIZE_MB ?? DEFAULT_MAX_SIZE_MB);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_MAX_SIZE_MB * 1024 * 1024;
  return Math.floor(raw * 1024 * 1024);
}

function resolveAuditRetentionDays() {
  const raw = Number(process.env.AUDIT_RETENTION_DAYS ?? DEFAULT_RETENTION_DAYS);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_RETENTION_DAYS;
  return Math.floor(raw);
}

function buildArchiveFileName(date = new Date()) {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${AUDIT_ARCHIVE_PREFIX}${yyyy}${mm}${dd}-${hh}${min}${ss}${AUDIT_ARCHIVE_SUFFIX}`;
}

async function rotateAuditLogIfNeeded(incomingEntryBytes: number) {
  const maxSizeBytes = resolveAuditMaxSizeBytes();

  let currentSize = 0;
  try {
    const info = await stat(AUDIT_LOG_PATH);
    currentSize = info.size;
  } catch (error: any) {
    if (error?.code !== "ENOENT") throw error;
    return;
  }

  if (currentSize + incomingEntryBytes <= maxSizeBytes) return;

  const archiveName = buildArchiveFileName();
  const archivePath = path.join(AUDIT_LOG_DIR, archiveName);
  await rename(AUDIT_LOG_PATH, archivePath);
}

async function pruneOldArchives() {
  const retentionDays = resolveAuditRetentionDays();
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  let files: string[] = [];
  try {
    files = await readdir(AUDIT_LOG_DIR);
  } catch (error: any) {
    if (error?.code === "ENOENT") return;
    throw error;
  }

  for (const file of files) {
    if (!file.startsWith(AUDIT_ARCHIVE_PREFIX) || !file.endsWith(AUDIT_ARCHIVE_SUFFIX)) {
      continue;
    }
    const fullPath = path.join(AUDIT_LOG_DIR, file);
    try {
      const info = await stat(fullPath);
      if (info.mtimeMs < cutoff) {
        await unlink(fullPath);
      }
    } catch (error: any) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }
  }
}

async function resolveAuditFilesNewestFirst() {
  const result: string[] = [];
  const activeInfo = await stat(AUDIT_LOG_PATH).catch(() => null);
  if (activeInfo) {
    result.push(AUDIT_LOG_PATH);
  }

  let files: string[] = [];
  try {
    files = await readdir(AUDIT_LOG_DIR);
  } catch (error: any) {
    if (error?.code === "ENOENT") return result;
    throw error;
  }

  const archives: { fullPath: string; mtimeMs: number }[] = [];
  for (const file of files) {
    if (!file.startsWith(AUDIT_ARCHIVE_PREFIX) || !file.endsWith(AUDIT_ARCHIVE_SUFFIX)) {
      continue;
    }
    const fullPath = path.join(AUDIT_LOG_DIR, file);
    const info = await stat(fullPath).catch(() => null);
    if (info) {
      archives.push({ fullPath, mtimeMs: info.mtimeMs });
    }
  }

  archives.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return result.concat(archives.map((item) => item.fullPath));
}

export type AuditLogEntry = {
  timestamp: string;
  action: string;
  status: "success" | "failed" | "blocked";
  actor: AuditActor | null;
  target: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
};

export type AuditStorageStats = {
  activeFileBytes: number;
  activeFileMb: number;
  archiveFiles: number;
  archiveBytes: number;
  archiveMb: number;
  oldestArchiveAt: string | null;
  newestArchiveAt: string | null;
  maxSizeMb: number;
  retentionDays: number;
};

export async function logAuditEvent(event: AuditEventInput) {
  const entry = {
    timestamp: new Date().toISOString(),
    action: event.action,
    status: event.status ?? "success",
    actor: event.actor ?? null,
    target: event.target ?? null,
    metadata: event.metadata ?? null,
  };

  try {
    await mkdir(path.dirname(AUDIT_LOG_PATH), { recursive: true });
    const serialized = `${JSON.stringify(entry)}\n`;
    await rotateAuditLogIfNeeded(Buffer.byteLength(serialized, "utf8"));
    await appendFile(AUDIT_LOG_PATH, serialized, "utf8");
    await pruneOldArchives();
  } catch (error) {
    console.warn("[Audit] Falha ao registrar evento de auditoria:", error);
  }
}

export async function readAuditEvents(options?: {
  limit?: number;
  action?: string;
  status?: "success" | "failed" | "blocked";
  actorContains?: string;
}) {
  const limit = Math.min(Math.max(options?.limit ?? 100, 1), MAX_FETCH);
  const result: AuditLogEntry[] = [];
  const actorNeedle = options?.actorContains?.trim().toLowerCase();
  const files = await resolveAuditFilesNewestFirst();
  if (files.length === 0) return [] as AuditLogEntry[];

  for (const filePath of files) {
    const content = await readFile(filePath, "utf8").catch((error: any) => {
      if (error?.code === "ENOENT") return "";
      throw error;
    });
    if (!content) continue;

    const lines = content.split("\n").filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const line = lines[i];
      if (!line) continue;

      let parsed: AuditLogEntry;
      try {
        parsed = JSON.parse(line) as AuditLogEntry;
      } catch {
        continue;
      }

      if (options?.action && parsed.action !== options.action) continue;
      if (options?.status && parsed.status !== options.status) continue;
      if (actorNeedle) {
        const haystack = [
          parsed.actor?.email ?? "",
          parsed.actor?.openId ?? "",
          parsed.actor?.ip ?? "",
          parsed.actor?.id ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(actorNeedle)) continue;
      }

      result.push(parsed);
      if (result.length >= limit) break;
    }
    if (result.length >= limit) break;
  }

  return result;
}

export async function getAuditStorageStats(): Promise<AuditStorageStats> {
  await mkdir(AUDIT_LOG_DIR, { recursive: true });

  const maxSizeRaw = Number(process.env.AUDIT_MAX_SIZE_MB ?? DEFAULT_MAX_SIZE_MB);
  const maxSizeMb = Number.isFinite(maxSizeRaw) && maxSizeRaw > 0 ? maxSizeRaw : DEFAULT_MAX_SIZE_MB;
  const retentionDays = resolveAuditRetentionDays();

  let activeFileBytes = 0;
  const activeInfo = await stat(AUDIT_LOG_PATH).catch(() => null);
  if (activeInfo) {
    activeFileBytes = activeInfo.size;
  }

  const files = await readdir(AUDIT_LOG_DIR).catch(() => [] as string[]);
  const archives: { bytes: number; mtimeMs: number }[] = [];
  for (const file of files) {
    if (!file.startsWith(AUDIT_ARCHIVE_PREFIX) || !file.endsWith(AUDIT_ARCHIVE_SUFFIX)) {
      continue;
    }
    const info = await stat(path.join(AUDIT_LOG_DIR, file)).catch(() => null);
    if (info) {
      archives.push({ bytes: info.size, mtimeMs: info.mtimeMs });
    }
  }

  const archiveBytes = archives.reduce((sum, item) => sum + item.bytes, 0);
  const oldestArchiveAt =
    archives.length > 0
      ? new Date(Math.min(...archives.map(item => item.mtimeMs))).toISOString()
      : null;
  const newestArchiveAt =
    archives.length > 0
      ? new Date(Math.max(...archives.map(item => item.mtimeMs))).toISOString()
      : null;

  return {
    activeFileBytes,
    activeFileMb: Number((activeFileBytes / (1024 * 1024)).toFixed(2)),
    archiveFiles: archives.length,
    archiveBytes,
    archiveMb: Number((archiveBytes / (1024 * 1024)).toFixed(2)),
    oldestArchiveAt,
    newestArchiveAt,
    maxSizeMb,
    retentionDays,
  };
}

function escapeCsv(value: unknown) {
  const text =
    value === null || value === undefined
      ? ""
      : typeof value === "string"
        ? value
        : JSON.stringify(value);
  const normalized = text.replace(/\r?\n/g, " ");
  const needsQuotes = /[",;]/.test(normalized);
  const escaped = normalized.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export function toAuditCsv(events: AuditLogEntry[]) {
  const header = [
    "timestamp",
    "action",
    "status",
    "actor_id",
    "actor_email",
    "actor_role",
    "actor_openId",
    "actor_ip",
    "target",
    "metadata",
  ];

  const lines = [header.join(";")];
  for (const event of events) {
    lines.push(
      [
        escapeCsv(event.timestamp),
        escapeCsv(event.action),
        escapeCsv(event.status),
        escapeCsv(event.actor?.id ?? ""),
        escapeCsv(event.actor?.email ?? ""),
        escapeCsv(event.actor?.role ?? ""),
        escapeCsv(event.actor?.openId ?? ""),
        escapeCsv(event.actor?.ip ?? ""),
        escapeCsv(event.target ?? ""),
        escapeCsv(event.metadata ?? ""),
      ].join(";")
    );
  }
  return lines.join("\n");
}
