import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

import { which } from "./shell.ts";
import { log, logStep } from "./log.ts";

import { VERDACCIO_URL } from "../../verdaccio/helpers/shell.ts";
import type { ScenarioDefinition } from "../types.ts";

/**
 * Write .npmrc pointing at Verdaccio and run `npm install` for clone tests.
 * For init tests the setup command handles dependency installation.
 */
export function npmInstall(
  workDir: string,
  packageManager: "npm",
  env?: Record<string, string>,
): void {
  writeNpmrc(workDir);

  if (packageManager !== "npm") {
    throw new Error("Only npm is supported as a package manager");
  }

  logStep("Installing dependencies");

  execFileSync(which("npm"), ["install"], {
    cwd: workDir,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
}

function writeNpmrc(dir: string): void {
  const npmrcPath = resolve(dir, ".npmrc");

  writeFileSync(npmrcPath, `registry=${VERDACCIO_URL}\n`);

  log(`Wrote .npmrc → ${VERDACCIO_URL}`);
}
