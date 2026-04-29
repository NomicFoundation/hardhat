import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { installDependencies } from "../helpers/install.ts";
import { git, which, ROOT_DIR } from "../helpers/shell.ts";
import { fmt, log, logStep, logWarning } from "../helpers/log.ts";
import {
  isVerdaccioRunning,
  VERDACCIO_URL,
} from "../../verdaccio/helpers/shell.ts";
import { loadScenario } from "../helpers/directory.ts";
import { start as verdaccioStart } from "../../verdaccio/start.ts";
import {
  publish as verdaccioPublish,
  sinceReleasePublish,
} from "../../verdaccio/publish.ts";
import { stop as verdaccioStop } from "../../verdaccio/stop.ts";
import type { Scenario } from "../types.ts";

export async function init(
  e2eCloneDirectory: string,
  scenarioPath: string,
  useLocal: boolean,
  forcePublish: boolean,
): Promise<void> {
  const scenario = loadScenario(e2eCloneDirectory, scenarioPath);

  if (scenario.definition.disabled === true) {
    logWarning(`Scenario "${scenario.id}" is disabled, skipping`);

    return;
  }

  const verdaccioAlreadyRunning = isVerdaccioRunning();

  if (useLocal && verdaccioAlreadyRunning && !forcePublish) {
    throw new Error(
      "A Verdaccio instance is already running. Using --use-local would\n" +
        "  override packages in the running registry.\n\n" +
        "  Add --force-publish to proceed, or stop the running instance first:\n" +
        "    pnpm verdaccio stop",
    );
  }

  const startedVerdaccio = !verdaccioAlreadyRunning;

  if (startedVerdaccio) {
    await verdaccioStart(true);
  }

  if (useLocal) {
    sinceReleasePublish();
  } else if (forcePublish || startedVerdaccio) {
    verdaccioPublish(false, true);
  }

  try {
    setupScenario(scenario);

    if (useLocal) {
      await upgradeLocalDependencies(scenario);
    }

    installScenarioDeps(scenario, useLocal);
  } finally {
    if (startedVerdaccio) {
      verdaccioStop();
    }
  }

  log("Scenario initialization complete, working directory setup:");
  log(`  cd ${scenario.workingDir}`);
}

/**
 * Clone/setup a scenario repo and run preinstall scripts.
 * Idempotent: reuses existing checkouts (fetch + checkout + clean).
 */
function setupScenario(scenario: Scenario): void {
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
    fetch(workingDir, definition.repo, definition.commit);
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
}

/**
 * Install dependencies using the scenario's package manager or custom
 * install script.
 */
function installScenarioDeps(
  scenario: Scenario,
  allowLockfileUpdates: boolean,
): void {
  const { scenarioDir, workingDir, definition } = scenario;

  if (definition.install !== undefined) {
    runCustomInstallScript(
      resolve(scenarioDir, definition.install),
      scenarioDir,
      workingDir,
      definition.env,
    );
  } else {
    installDependencies(
      workingDir,
      definition.packageManager,
      allowLockfileUpdates,
      definition.env,
    );
  }
}

/**
 * Patch the scenario's package.json to pin hardhat / @nomicfoundation/*
 * dependencies to the latest versions available in Verdaccio. Verdaccio
 * merges locally published packages with npm (via proxy), so this returns
 * bumped local versions where available and npm versions for everything else.
 */
async function upgradeLocalDependencies(scenario: Scenario): Promise<void> {
  logStep("Upgrading dependencies to latest Verdaccio versions");

  const pkgJsonPath = resolve(scenario.workingDir, "package.json");
  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));

  let updated = false;

  for (const depField of ["dependencies", "devDependencies"] as const) {
    const deps = pkgJson[depField] as Record<string, string> | undefined;

    if (deps === undefined) {
      continue;
    }

    for (const name of Object.keys(deps)) {
      if (name !== "hardhat" && !name.startsWith("@nomicfoundation/")) {
        continue;
      }

      const version = await getLatestFromVerdaccio(name);

      if (version !== undefined) {
        deps[name] = version;
        updated = true;
        log(`  ${fmt.pkg(name)} → ${fmt.version(version)}`);
      }
    }
  }

  if (updated) {
    writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + "\n");
  } else {
    log("No matching dependencies to update");
  }
}

async function getLatestFromVerdaccio(
  packageName: string,
): Promise<string | undefined> {
  try {
    const response = await globalThis.fetch(`${VERDACCIO_URL}/${packageName}`);

    if (!response.ok) {
      return undefined;
    }

    const metadata = (await response.json()) as {
      "dist-tags"?: { latest?: string };
    };

    return metadata["dist-tags"]?.latest;
  } catch {
    return undefined;
  }
}

function clone(scenarioWorkingDir: string, repo: string): void {
  logStep(`Cloning ${repo}`);

  git(
    ["clone", `https://github.com/${repo}.git`, scenarioWorkingDir],
    ROOT_DIR,
  );
}

function fetch(
  scenarioWorkingDir: string,
  repo: string,
  commit: string,
): void {
  logStep(`Fetching ${repo}`);

  // Fetch the specific commit by SHA so that the checkout below succeeds even
  // if the commit is no longer the tip of any branch (e.g. after a force-push
  // that orphaned the previously-fetched commits, or when the SHA points at
  // an intermediate commit on a long-lived branch).
  git(["fetch", "origin", commit], scenarioWorkingDir);
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
