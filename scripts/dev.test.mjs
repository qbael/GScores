import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";

async function waitFor(check) {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    try {
      if (await check()) return;
    } catch {}
    await delay(100);
  }
  throw new Error("Timed out waiting for dev servers");
}

async function portIsFree(port) {
  const server = createServer();
  try {
    server.listen(port, "127.0.0.1");
    await once(server, "listening");
    return true;
  } catch {
    return false;
  } finally {
    if (server.listening) await new Promise((resolve) => server.close(resolve));
  }
}

test(
  "dev logs URLs, proxies missing API routes, reloads output and releases ports",
  { timeout: 240_000 },
  async () => {
    for (const port of [3002, 5173]) {
      assert.ok(
        await portIsFree(port),
        "Stop the existing dev server on port " + port,
      );
    }

    const child = spawn(process.execPath, ["scripts/dev.mjs"], {
      env: {
        ...process.env,
        PORT: "3002",
        API_PROXY_TARGET: "http://127.0.0.1:3002",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    const exited = once(child, "exit");

    try {
      await waitFor(async () => (await fetch("http://127.0.0.1:5173")).ok);
      await waitFor(async () => {
        const response = await fetch("http://127.0.0.1:5173/api/health");
        const body = await response.json();
        return (
          response.status === 404 &&
          body.statusCode === 404 &&
          body.message === "Cannot GET /api/health"
        );
      });

      const apiUrlLog = "API: http://127.0.0.1:3002/api";
      await waitFor(() => output.includes(apiUrlLog));
      assert.ok(output.includes("http://localhost:5173/"), output);
      const startupLogs = output.split(apiUrlLog).length;

      const { utimes, stat } = await import("node:fs/promises");
      const path = "apps/api/dist/main.js";
      const times = await stat(path);
      try {
        await utimes(path, new Date(), new Date());
        await waitFor(() => output.includes("Restarting"));
        await waitFor(() => output.split(apiUrlLog).length > startupLogs);
        await waitFor(
          async () =>
            (await fetch("http://127.0.0.1:3002/api/health")).status === 404,
        );
      } finally {
        await utimes(path, times.atime, times.mtime);
      }
    } catch (error) {
      throw new Error(error.message + "\n" + output, { cause: error });
    } finally {
      child.kill("SIGTERM");
      const [code] = await exited;
      assert.equal(code, 0, output);
      await waitFor(
        async () => (await portIsFree(3002)) && (await portIsFree(5173)),
      );
    }
  },
);
