import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { getBackupsDir, getDatabaseConfig, getMysqlClientConnectionArgs, getTimestamp } from "./db-utils.mjs";

async function run() {
  const config = getDatabaseConfig();
  const backupsDir = getBackupsDir();
  fs.mkdirSync(backupsDir, { recursive: true });

  const filename = `${config.databaseName}_${getTimestamp()}.sql`;
  const outputPath = path.join(backupsDir, filename);

  const args = [
    ...getMysqlClientConnectionArgs(config),
    "--single-transaction",
    "--set-gtid-purged=OFF",
    "--databases",
    config.databaseName,
  ];

  const child = spawn("mysqldump", args, {
    env: {
      ...process.env,
      MYSQL_PWD: config.password,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const output = fs.createWriteStream(outputPath);
  child.stdout.pipe(output);

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const exitCode = await new Promise((resolve) => {
    child.on("close", resolve);
  });

  output.end();

  if (exitCode !== 0) {
    try {
      fs.unlinkSync(outputPath);
    } catch {}
    throw new Error(stderr.trim() || "Falha ao executar mysqldump.");
  }

  const stats = fs.statSync(outputPath);
  console.log(`Backup criado com sucesso: ${outputPath}`);
  console.log(`Tamanho: ${(stats.size / 1024).toFixed(2)} KB`);
}

run().catch((error) => {
  console.error(`[backup:db] ${error.message}`);
  process.exit(1);
});
