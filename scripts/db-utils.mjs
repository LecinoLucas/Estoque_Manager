import path from "node:path";
import process from "node:process";
import { config as loadEnv } from "dotenv";

loadEnv();

export function getDatabaseConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL não configurada no .env");
  }

  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL inválida. Formato esperado: mysql://usuario:senha@host:porta/banco");
  }

  const protocol = parsed.protocol.replace(":", "");
  if (protocol !== "mysql") {
    throw new Error(`Banco não suportado por este script: ${protocol}. Use uma URL mysql://`);
  }

  const databaseName = parsed.pathname.replace(/^\//, "");
  if (!databaseName) {
    throw new Error("DATABASE_URL sem nome do banco (path vazio).");
  }

  return {
    host: parsed.hostname || "localhost",
    port: String(parsed.port || "3306"),
    user: decodeURIComponent(parsed.username || "root"),
    password: decodeURIComponent(parsed.password || ""),
    databaseName,
  };
}

export function getBackupsDir() {
  return path.resolve(process.cwd(), "backups");
}

export function getMysqlClientConnectionArgs(config) {
  const args = [];
  const socket = process.env.MYSQL_SOCKET;
  const isLocalhost = config.host === "localhost";

  if (socket) {
    args.push("--socket", socket);
  } else if (!isLocalhost) {
    args.push("--protocol=TCP", "-h", config.host, "-P", config.port);
  }

  args.push("-u", config.user);
  return args;
}

export function getTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const mi = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `${yyyy}${mm}${dd}_${hh}${mi}${ss}`;
}
