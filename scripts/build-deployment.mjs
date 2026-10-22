import { spawnSync } from "node:child_process";

const npm = process.env.npm_execpath;
if (!npm) throw new Error("Run this build through npm run build:deployment.");
// Vercel supplies NODE_ENV=production. React's production bundle cannot run act().
// Isolate test mode to validation subprocesses; always build the app in production.
for (const [args, mode] of [
  [["run", "typecheck"], "test"],
  [["test", "--", "--maxWorkers=2"], "test"],
  [["run", "build"], "production"]
]) {
  const result = spawnSync(process.execPath, [npm, ...args], {
    stdio: "inherit", env: { ...process.env, NODE_ENV: mode }
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
