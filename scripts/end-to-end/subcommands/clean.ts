import { existsSync, rmSync } from "node:fs";
import { fmt, log, logStep } from "../helpers/log.ts";
import { resolveScenarioWorkingDir } from "../helpers/directory.ts";

export function clean(
  e2eCloneDirectory: string,
  scenarioFilePath: string,
): void {
  const scenarioWorkingDir = resolveScenarioWorkingDir(
    e2eCloneDirectory,
    scenarioFilePath,
  );

  if (!existsSync(scenarioWorkingDir)) {
    log(`Nothing to clean: ${fmt.deemphasize(scenarioWorkingDir)}`);

    return;
  }

  logStep(`Cleaning ${scenarioWorkingDir}`);

  rmSync(scenarioWorkingDir, { recursive: true });

  log(`Removed: ${fmt.deemphasize(scenarioWorkingDir)}`);
}
