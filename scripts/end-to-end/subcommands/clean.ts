import { existsSync, rmSync } from "node:fs";
import { fmt, log, logStep } from "../helpers/log.ts";
import { resolveScenarioRepoDir } from "../helpers/directory.ts";

export function clean(e2eCloneDirectory: string, scenarioPath: string): void {
  const scenarioRepoDir = resolveScenarioRepoDir(
    e2eCloneDirectory,
    scenarioPath,
  );

  if (!existsSync(scenarioRepoDir)) {
    log(`Nothing to clean: ${fmt.deemphasize(scenarioRepoDir)}`);

    return;
  }

  logStep(`Cleaning ${scenarioRepoDir}`);

  rmSync(scenarioRepoDir, { recursive: true });

  log(`Removed: ${fmt.deemphasize(scenarioRepoDir)}`);
}
