// Cross-platform preinstall guard: ensure the workspace is installed with pnpm.
// (Replaces the original `sh -c` script that only worked on Linux/macOS.)
import { rmSync } from "node:fs";
import { execSync } from "node:child_process";

try {
  rmSync("package-lock.json", { force: true });
  rmSync("yarn.lock", { force: true });
} catch {
  /* ignore */
}

const agent = process.env.npm_config_user_agent || "";
if (!agent.startsWith("pnpm/")) {
  console.error("Use pnpm instead of npm/yarn to install this workspace.");
  process.exit(1);
}
