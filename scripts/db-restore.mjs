import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { getBackupsDir, getDatabaseConfig, getMysqlClientConnectionArgs } from "./db-utils.mjs";

function getBackupFilePath() {
  const argPath = process.argv[2];
  if (argPath) {
    return path.resolve(process.cwd(), argPath);
  }

  const config = getDatabaseConfig();
  const backupsDir = getBackupsDir();
  if (!fs.existsSync(backupsDir)) {
    throw new Error(`Pasta de backups não encontrada: ${backupsDir}`);
  }

  const candidates = fs
    .readdirSync(backupsDir)
    .filter((name) => name.startsWith(`${config.databaseName}_`) && name.endsWith(".sql"))
    .map((name) => {
      const fullPath = path.join(backupsDir, name);
      return { fullPath, mtimeMs: fs.statSync(fullPath).mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (!candidates.length) {
    throw new Error(`Nenhum backup encontrado em ${backupsDir} para o banco ${config.databaseName}.`);
  }

  return candidates[0].fullPath;
}

async function run() {
  const config = getDatabaseConfig();
  const backupPath = getBackupFilePath();

  if (!fs.existsSync(backupPath)) {
    throw new Error(`Arquivo de backup não encontrado: ${backupPath}`);
  }

  const args = [...getMysqlClientConnectionArgs(config)];

  const child = spawn("mysql", args, {
    env: {
      ...process.env,
      MYSQL_PWD: config.password,
    },
    stdio: ["pipe", "pipe", "pipe"],
  });

  const input = fs.createReadStream(backupPath);
  input.pipe(child.stdin);

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const exitCode = await new Promise((resolve) => {
    child.on("close", resolve);
  });

  if (exitCode !== 0) {
    throw new Error(stderr.trim() || "Falha ao restaurar backup com mysql.");
  }

  console.log(`Restore concluído com sucesso usando: ${backupPath}`);
}

run().catch((error) => {
  console.error(`[restore:db] ${error.message}`);
  process.exit(1);
});
