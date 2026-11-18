import { spawn } from "node:child_process";

// shortcut: POSIX process groups; add Windows teardown when Windows development is supported.
const children = [];
let stopping = false;

function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) {
    if (!child.pid) continue;
    try {
      // npm starts descendants; stop the whole group to release dev ports.
      process.kill(-child.pid, "SIGTERM");
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  }
}

for (const [workspace, script] of [
  ["@g-scores/api", "dev:build"],
  ["@g-scores/api", "dev"],
  ["@g-scores/web", "dev"],
]) {
  const child = spawn("npm", ["run", script, "--workspace=" + workspace], {
    stdio: "inherit",
    detached: true,
  });
  children.push(child);
  child.on("error", (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on("exit", (code) => stop(code ?? 1));
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
