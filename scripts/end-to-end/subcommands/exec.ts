import { execSync } from "node:child_process";
import { ensureScenarioInitialized } from "../helpers/scenario-setup.ts";
import type { ForceCheckout, ForcePublish, UseLocal } from "./init.ts";
import { logStep } from "../helpers/log.ts";

export async function exec(
  e2eCloneDirectory: string,
  scenarioPath: string,
  command: string | undefined,
  useLocal: UseLocal,
  forceCheckout: ForceCheckout,
  forcePublish: ForcePublish,
): Promise<void> {
  const scenario = await ensureScenarioInitialized(
    e2eCloneDirectory,
    scenarioPath,
    useLocal,
    forceCheckout,
    forcePublish,
  );

  const resolvedCommand = command ?? scenario.definition.defaultCommand;

  runCommand(resolvedCommand, scenario.workingDir, scenario.definition.env);
}

function runCommand(
  command: string,
  cwd: string,
  env?: Record<string, string>,
): void {
  logStep(`Running: ${command}`);

  execSync(command, {
    cwd,
    stdio: "inherit",
    env: {
      ...process.env,
      ...env,
    },
  });
}
