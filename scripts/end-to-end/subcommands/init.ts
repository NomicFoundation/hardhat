import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { npmInstall } from "../helpers/install.ts";
import { git, which, ROOT_DIR } from "../helpers/shell.ts";
import { log, logStep } from "../helpers/log.ts";
import {
  VERDACCIO_URL,
  isVerdaccioRunning,
} from "../../verdaccio/helpers/shell.ts";
import { loadScenario } from "../helpers/directory.ts";
import { start as verdaccioStart } from "../../verdaccio/start.ts";
import { publish as verdaccioPublish } from "../../verdaccio/publish.ts";
import { stop as verdaccioStop } from "../../verdaccio/stop.ts";
import type { Scenario } from "../types.ts";
import { isCloneScenarioDefinition } from "../schema/scenario-schema.ts";

export async function init(
  e2eCloneDirectory: string,
  scenarioFilePath: string,
  startVerdaccioFlag: boolean,
): Promise<void> {
  const scenario = loadScenario(e2eCloneDirectory, scenarioFilePath);

  if (startVerdaccioFlag) {
    await verdaccioStart(true);

    verdaccioPublish(false, true);

    try {
      initializeScenario(scenario);
    } finally {
      verdaccioStop();
    }
  } else {
    if (!isVerdaccioRunning()) {
      throw new Error(
        "Verdaccio is not running. Either start it manually:\n" +
          "  node scripts/verdaccio/install.ts --start --background\n" +
          "  node scripts/verdaccio/install.ts --publish --no-git-checks\n" +
          "Or pass --start-verdaccio to start it automatically.",
      );
    }

    initializeScenario(scenario);
  }

  log(`cd ${scenario.workingDir}`);
}

/**
 * Clone/setup a scenario repo and install hardhat from Verdaccio.
 * Idempotent: reuses existing checkouts (fetch + checkout + clean).
 */
function initializeScenario(scenario: Scenario): void {
  if (!isCloneScenarioDefinition(scenario.definition)) {
    throw Error(
      `Only 'clone' is supported as a scenario type, not ${(scenario.definition as any).type}`,
    );
  }

  const { scenarioDir, workingDir, definition } = scenario;

  cloneOrFetch(workingDir, definition.repo, definition.submodules ?? false);

  checkout(workingDir, definition.commit);

  clean(workingDir);

  if (definition.preinstall !== undefined) {
    runPreinstallScript(
      resolve(scenarioDir, definition.preinstall),
      scenarioDir,
      workingDir,
      definition.env,
    );
  }

  if (scenario.definition.install !== undefined) {
    runCustomInstallScript(
      resolve(scenarioDir, definition.install),
      scenarioDir,
      workingDir,
      definition.env,
    );
  } else {
    npmInstall(workingDir, definition.packageManager, definition.env);
  }
}

function cloneOrFetch(
  scenarioWorkingDir: string,
  repo: string,
  submodules: boolean,
): void {
  if (!existsSync(scenarioWorkingDir)) {
    logStep(`Cloning ${repo}`);

    const cloneArgs = [
      "clone",
      `https://github.com/${repo}.git`,
      scenarioWorkingDir,
    ];

    if (submodules) {
      cloneArgs.push("--recurse-submodules");
    }

    git(cloneArgs, ROOT_DIR);
  } else {
    logStep(`Fetching ${repo}`);

    git(["fetch", "origin"], scenarioWorkingDir);
  }
}

function checkout(scenarioWorkingDir: string, commit: string): void {
  logStep(`Checking out ${commit}`);

  git(["checkout", commit], scenarioWorkingDir);
}

function clean(scenarioWorkingDir: string): void {
  logStep("Cleaning working tree");

  git(["checkout", "."], scenarioWorkingDir);
  git(["clean", "-fdx"], scenarioWorkingDir);
}

function runPreinstallScript(
  scriptPath: string,
  scenarioDir: string,
  workingDir: string,
  env?: Record<string, string>,
): void {
  logStep("Running preinstall script");

  execFileSync(which("bash"), [scriptPath], {
    cwd: workingDir,
    stdio: "inherit",
    env: {
      ...process.env,
      ...env,
      E2E_TEST_DIR: scenarioDir,
    },
  });
}

function runCustomInstallScript(
  scriptPath: string,
  testDir: string,
  workDir: string,
  env?: Record<string, string>,
): void {
  logStep("Running custom install script");

  execFileSync(which("bash"), [scriptPath], {
    cwd: workDir,
    stdio: "inherit",
    env: {
      ...process.env,
      ...env,
      E2E_REPO_DIR: workDir,
      E2E_HARDHAT_DIR: resolve(ROOT_DIR, "v-next", "hardhat"),
      E2E_VERDACCIO_URL: VERDACCIO_URL,
      E2E_TEST_DIR: testDir,
    },
  });
}
