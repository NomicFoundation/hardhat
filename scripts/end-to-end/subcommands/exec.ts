import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { loadScenario } from "../helpers/directory.ts";
import { init } from "./init.ts";
import { logStep } from "../helpers/log.ts";

export async function exec(
  e2eCloneDirectory: string,
  scenarioPath: string,
  command: string | undefined,
): Promise<void> {
  const scenario = loadScenario(e2eCloneDirectory, scenarioPath);

  if (!existsSync(scenario.workingDir)) {
    await init(e2eCloneDirectory, scenarioPath);
  }

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
