#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const ROOT_DIR = process.cwd();
const LOG_DIR = path.join(ROOT_DIR, ".dev-logs");
const PROCESS_FILE = path.join(ROOT_DIR, "processes.json");
const BACKEND_LOG = path.join(LOG_DIR, "backend.log");
const FRONTEND_LOG = path.join(LOG_DIR, "frontend.log");
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

const state = {
  backendUrl: "http://localhost:3001",
  frontendUrl: "http://localhost:5173",
  shuttingDown: false,
};

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function ensureFile(filePath, content = "") {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, "utf8");
  }
}

function readProcesses() {
  try {
    ensureFile(
      PROCESS_FILE,
      JSON.stringify(
        { backend: null, frontend: null, startedAt: null },
        null,
        2
      )
    );
    const raw = fs.readFileSync(PROCESS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return {
      backend: parsed.backend ?? null,
      frontend: parsed.frontend ?? null,
      startedAt: parsed.startedAt ?? null,
    };
  } catch {
    return { backend: null, frontend: null, startedAt: null };
  }
}

function writeProcesses(data) {
  fs.writeFileSync(PROCESS_FILE, JSON.stringify(data, null, 2), "utf8");
}

function isPidRunning(pid) {
  if (!pid || Number(pid) <= 0) return false;
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch {
    return false;
  }
}

function listListeningPidsOnPorts(ports) {
  if (process.platform === "win32") return [];
  if (!Array.isArray(ports) || ports.length === 0) return [];

  const result = spawnSync("lsof", ["-nP", "-iTCP", "-sTCP:LISTEN"], {
    encoding: "utf8",
  });

  if (result.status !== 0 || !result.stdout) return [];

  const tracked = new Set(ports.map((port) => String(port)));
  const pids = new Set();
  const lines = result.stdout.split(/\r?\n/).slice(1);

  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = line.trim().split(/\s+/);
    const pid = Number(cols[1]);
    const lastCol = cols.at(-1) ?? "";
    const match = lastCol.match(/:(\d+)\s*\(LISTEN\)$/);
    if (!match) continue;
    const port = match[1];
    if (!tracked.has(port) || Number.isNaN(pid)) continue;
    pids.add(pid);
  }

  return Array.from(pids);
}

function isPortListening(port) {
  return listListeningPidsOnPorts([port]).length > 0;
}

function tailLines(content, n) {
  const lines = content.split(/\r?\n/);
  return lines.slice(Math.max(lines.length - n, 0)).join("\n");
}

function showLogs() {
  ensureDir(LOG_DIR);
  ensureFile(BACKEND_LOG, "");
  ensureFile(FRONTEND_LOG, "");

  const backendText = fs.readFileSync(BACKEND_LOG, "utf8");
  const frontendText = fs.readFileSync(FRONTEND_LOG, "utf8");

  console.log("=== BACKEND (últimas 100 linhas) ===");
  console.log(tailLines(backendText, 100) || "(sem logs)");
  console.log("=== FRONTEND (últimas 100 linhas) ===");
  console.log(tailLines(frontendText, 100) || "(sem logs)");
}

function killProcessTree(pid) {
  if (!isPidRunning(pid)) return;

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }

  try {
    process.kill(-Number(pid), "SIGTERM");
  } catch {
    try {
      process.kill(Number(pid), "SIGTERM");
    } catch {
      return;
    }
  }

  setTimeout(() => {
    if (!isPidRunning(pid)) return;
    try {
      process.kill(-Number(pid), "SIGKILL");
    } catch {
      try {
        process.kill(Number(pid), "SIGKILL");
      } catch {
        // ignore
      }
    }
  }, 1200);
}

function stopManagedProcesses({ silent = false } = {}) {
  const processes = readProcesses();
  const alreadyKilled = new Set();

  if (processes.backend?.pid) {
    killProcessTree(processes.backend.pid);
    alreadyKilled.add(Number(processes.backend.pid));
    if (!silent) console.log(`[STOP] backend PID ${processes.backend.pid}`);
  }
  if (processes.frontend?.pid) {
    killProcessTree(processes.frontend.pid);
    alreadyKilled.add(Number(processes.frontend.pid));
    if (!silent) console.log(`[STOP] frontend PID ${processes.frontend.pid}`);
  }

  for (const pid of listListeningPidsOnPorts([3001, 5173])) {
    if (alreadyKilled.has(pid)) continue;
    killProcessTree(pid);
    if (!silent) console.log(`[STOP] orphan PID ${pid}`);
  }

  writeProcesses({ backend: null, frontend: null, startedAt: null });
}

function appendLog(filePath, chunk) {
  fs.appendFileSync(filePath, chunk, "utf8");
}

function printPrefixed(prefix, text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    console.log(`${prefix} ${line}`);
  }
}

function detectPortAndUpdate(service, text) {
  const urlMatch = text.match(/https?:\/\/(?:localhost|127\.0\.0\.1):(\d{2,5})/i);
  const portMatch = text.match(/\bport(?:a)?\s*[:=]?\s*(\d{2,5})\b/i);
  const port = urlMatch?.[1] || portMatch?.[1];
  if (!port) return;

  const nextUrl = `http://localhost:${port}`;
  if (service === "backend" && state.backendUrl !== nextUrl) {
    state.backendUrl = nextUrl;
    printStatus();
  }
  if (service === "frontend" && state.frontendUrl !== nextUrl) {
    state.frontendUrl = nextUrl;
    printStatus();
  }
}

function attachLogging(child, service) {
  const prefix = service === "backend" ? "[BACKEND]" : "[FRONTEND]";
  const logFile = service === "backend" ? BACKEND_LOG : FRONTEND_LOG;

  const onData = (chunk) => {
    const text = chunk.toString();
    appendLog(logFile, text);
    printPrefixed(prefix, text);
    detectPortAndUpdate(service, text);
  };

  child.stdout?.on("data", onData);
  child.stderr?.on("data", onData);
}

function printStatus() {
  console.log("status: running");
  console.log(`backend: ${state.backendUrl}`);
  console.log(`frontend: ${state.frontendUrl}`);
}

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function resolveServiceConfig() {
  const backendCandidates = ["backend", "server"];
  const frontendCandidates = ["frontend", "client"];

  const backendDir = backendCandidates
    .map((name) => path.join(ROOT_DIR, name))
    .find((dir) => fileExists(dir));
  const frontendDir = frontendCandidates
    .map((name) => path.join(ROOT_DIR, name))
    .find((dir) => fileExists(dir));

  const backendHasOwnPackage = backendDir
    ? fileExists(path.join(backendDir, "package.json"))
    : false;
  const frontendHasOwnPackage = frontendDir
    ? fileExists(path.join(frontendDir, "package.json"))
    : false;

  return {
    backend: backendHasOwnPackage
      ? { cmd: npmCmd, args: ["run", "dev"], cwd: backendDir, env: process.env }
      : { cmd: npmCmd, args: ["run", "dev:backend"], cwd: ROOT_DIR, env: { ...process.env, PORT: "3001", NODE_ENV: "development" } },
    frontend: frontendHasOwnPackage
      ? { cmd: npmCmd, args: ["run", "dev"], cwd: frontendDir, env: process.env }
      : { cmd: npmCmd, args: ["run", "dev:frontend"], cwd: ROOT_DIR, env: process.env },
    backendDir,
    frontendDir,
  };
}

function assertProjectDirs() {
  const { backendDir, frontendDir } = resolveServiceConfig();
  if (!backendDir) {
    throw new Error("Diretório backend/server não encontrado.");
  }
  if (!frontendDir) {
    throw new Error("Diretório frontend/client não encontrado.");
  }
}

function start() {
  assertProjectDirs();
  ensureDir(LOG_DIR);
  fs.writeFileSync(BACKEND_LOG, "", "utf8");
  fs.writeFileSync(FRONTEND_LOG, "", "utf8");

  stopManagedProcesses({ silent: true });

  const existing = readProcesses();
  if (
    (existing.backend?.pid && isPidRunning(existing.backend.pid)) ||
    (existing.frontend?.pid && isPidRunning(existing.frontend.pid))
  ) {
    console.log("Já existem processos em execução gerenciados pelo dev-manager.");
    printStatus();
    process.exit(0);
  }

  const services = resolveServiceConfig();

  const backend = spawn(services.backend.cmd, services.backend.args, {
    cwd: services.backend.cwd,
    detached: false,
    env: services.backend.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const frontend = spawn(services.frontend.cmd, services.frontend.args, {
    cwd: services.frontend.cwd,
    detached: false,
    env: services.frontend.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  writeProcesses({
    startedAt: new Date().toISOString(),
    backend: { pid: backend.pid, cwd: services.backend.cwd, logFile: BACKEND_LOG },
    frontend: { pid: frontend.pid, cwd: services.frontend.cwd, logFile: FRONTEND_LOG },
  });

  attachLogging(backend, "backend");
  attachLogging(frontend, "frontend");
  printStatus();

  const shutdown = (signal = "SIGTERM") => {
    if (state.shuttingDown) return;
    state.shuttingDown = true;
    console.log(`[DEV-MANAGER] Encerrando processos (${signal})...`);
    stopManagedProcesses({ silent: true });
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("exit", () => {
    if (!state.shuttingDown) stopManagedProcesses({ silent: true });
  });
  process.on("uncaughtException", (err) => {
    console.error("[DEV-MANAGER] uncaughtException:", err);
    shutdown("uncaughtException");
  });
  process.on("unhandledRejection", (err) => {
    console.error("[DEV-MANAGER] unhandledRejection:", err);
    shutdown("unhandledRejection");
  });

  backend.on("exit", (code, signal) => {
    if (state.shuttingDown) return;
    console.log(`[BACKEND] processo finalizado (code=${code ?? "null"}, signal=${signal ?? "null"})`);
    if (isPortListening(3001)) {
      console.log("[DEV-MANAGER] backend existente detectado na porta 3001, mantendo frontend ativo.");
      return;
    }
    shutdown("backend-exit");
  });
  frontend.on("exit", (code, signal) => {
    if (state.shuttingDown) return;
    console.log(`[FRONTEND] processo finalizado (code=${code ?? "null"}, signal=${signal ?? "null"})`);
    shutdown("frontend-exit");
  });

  process.stdin.resume();
}

function main() {
  const command = process.argv[2];

  switch (command) {
    case "start":
      start();
      break;
    case "stop":
      stopManagedProcesses();
      console.log("Processos encerrados.");
      break;
    case "log":
      showLogs();
      break;
    default:
      console.log("Uso: node dev-manager.js <start|stop|log>");
      process.exit(1);
  }
}

main();
