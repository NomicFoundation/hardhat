import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

import { which } from "./shell.ts";
import { log, logStep } from "./log.ts";

import { VERDACCIO_URL } from "../../verdaccio/helpers/shell.ts";
import type { ScenarioDefinition } from "../types.ts";

/**
 * Configure the registry to point at Verdaccio and run `install` for
 * the scenario's package manager.
 */
export function installDependencies(
  workDir: string,
  packageManager: ScenarioDefinition["packageManager"],
  env?: Record<string, string>,
): void {
  writeRegistryConfig(workDir, packageManager);

  if (packageManager === "yarn") {
    logStep("Enabling corepack for yarn");

    execFileSync(which("corepack"), ["enable", "yarn"], {
      cwd: workDir,
      stdio: "inherit",
    });
  }

  logStep("Installing dependencies");

  const installArgs =
    packageManager === "yarn"
      ? ["install"]
      : // Required by bun as it may not pickup the cwd bunfig.toml
        ["install", `--registry=${VERDACCIO_URL}`];

  execFileSync(which(packageManager), installArgs, {
    cwd: workDir,
    stdio: "inherit",
    env: { ...process.env, ...env, COREPACK_ENABLE_DOWNLOAD_PROMPT: "0" },
  });
}

function writeRegistryConfig(
  dir: string,
  packageManager: ScenarioDefinition["packageManager"],
): void {
  if (packageManager === "bun") {
    const bunfigPath = resolve(dir, "bunfig.toml");
    writeFileSync(bunfigPath, `[install]\nregistry = "${VERDACCIO_URL}"\n`);
    log(`Wrote bunfig.toml → ${VERDACCIO_URL}`);
  } else if (packageManager === "yarn") {
    const yarnrcPath = resolve(dir, ".yarnrc.yml");

    let existing = "";
    try {
      existing = readFileSync(yarnrcPath, "utf-8");
    } catch {}

    const registryConfig = `npmRegistryServer: "${VERDACCIO_URL}"\nunsafeHttpWhitelist:\n  - "localhost"\n  - "127.0.0.1"\n`;

    writeFileSync(
      yarnrcPath,
      existing ? `${existing.trimEnd()}\n\n${registryConfig}` : registryConfig,
    );

    log(`Wrote .yarnrc.yml → ${VERDACCIO_URL}`);
  } else {
    const npmrcPath = resolve(dir, ".npmrc");

    writeFileSync(npmrcPath, `registry=${VERDACCIO_URL}\n`);

    log(`Wrote .npmrc → ${VERDACCIO_URL}`);
  }
}
