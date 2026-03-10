import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { npmInstall } from "../helpers/install.ts";
import { git, which, ROOT_DIR } from "../helpers/shell.ts";
import { log, logStep } from "../helpers/log.ts";
import { isVerdaccioRunning } from "../../verdaccio/helpers/shell.ts";
import { loadScenario } from "../helpers/directory.ts";
import { start as verdaccioStart } from "../../verdaccio/start.ts";
import { publish as verdaccioPublish } from "../../verdaccio/publish.ts";
import { stop as verdaccioStop } from "../../verdaccio/stop.ts";
import type { Scenario } from "../types.ts";

export async function init(
  e2eCloneDirectory: string,
  scenarioPath: string,
): Promise<void> {
  const scenario = loadScenario(e2eCloneDirectory, scenarioPath);

  const runTemporaryVerdaccioInstance = !isVerdaccioRunning();

  if (runTemporaryVerdaccioInstance) {
    await verdaccioStart(true);

    verdaccioPublish(false, true);
  }

  try {
    initializeScenario(scenario);
  } finally {
    if (runTemporaryVerdaccioInstance) {
      verdaccioStop();
    }
  }

  log("Scenario initialization complete, working directory setup:");
  log(`  cd ${scenario.workingDir}`);
}

/**
 * Clone/setup a scenario repo and install hardhat from Verdaccio.
 * Idempotent: reuses existing checkouts (fetch + checkout + clean).
 */
function initializeScenario(scenario: Scenario): void {
  const { scenarioDir, workingDir, definition } = scenario;
  const submodules = definition.submodules ?? false;

  if (!existsSync(workingDir)) {
    // Fresh clone flow
    clone(workingDir, definition.repo);
    checkout(workingDir, definition.commit);

    if (submodules) {
      updateSubmodules(workingDir);
    }
  } else {
    // Re-init flow
    fetch(workingDir, definition.repo);
    checkout(workingDir, definition.commit);
    clean(workingDir);

    if (submodules) {
      updateSubmodules(workingDir);
    }
  }

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

function clone(scenarioWorkingDir: string, repo: string): void {
  logStep(`Cloning ${repo}`);

  git(
    ["clone", `https://github.com/${repo}.git`, scenarioWorkingDir],
    ROOT_DIR,
  );
}

function fetch(scenarioWorkingDir: string, repo: string): void {
  logStep(`Fetching ${repo}`);

  git(["fetch", "origin"], scenarioWorkingDir);
}

function updateSubmodules(scenarioWorkingDir: string): void {
  logStep("Updating submodules");

  git(["submodule", "update", "--init", "--recursive"], scenarioWorkingDir);
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
      E2E_TEST_DIR: testDir,
    },
  });
}
