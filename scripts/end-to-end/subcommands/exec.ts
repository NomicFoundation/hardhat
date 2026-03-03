import { execSync } from "node:child_process";
import { loadScenario } from "../helpers/directory.ts";
import { init } from "./init.ts";
import { logStep } from "../helpers/log.ts";
import { start as verdaccioStart } from "../../verdaccio/start.ts";
import { publish as verdaccioPublish } from "../../verdaccio/publish.ts";
import { stop as verdaccioStop } from "../../verdaccio/stop.ts";

export async function exec(
  e2eCloneDirectory: string,
  scenarioPath: string,
  command: string,
  withInitFlag: boolean,
  withVerdaccioFlag: boolean,
): Promise<void> {
  const scenario = loadScenario(e2eCloneDirectory, scenarioPath);

  if (withVerdaccioFlag) {
    await verdaccioStart(true);
    verdaccioPublish(false, true);

    try {
      if (withInitFlag) {
        await init(e2eCloneDirectory, scenarioPath, false);
      }

      runCommand(command, scenario.workingDir, scenario.definition.env);
    } finally {
      verdaccioStop();
    }
  } else {
    if (withInitFlag) {
      await init(e2eCloneDirectory, scenarioPath, false);
    }

    runCommand(command, scenario.workingDir, scenario.definition.env);
  }
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
