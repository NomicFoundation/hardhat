import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { isVerdaccioRunning } from "../../verdaccio/helpers/shell.ts";
import { publish as verdaccioPublish } from "../../verdaccio/publish.ts";
import { start as verdaccioStart } from "../../verdaccio/start.ts";
import { stop as verdaccioStop } from "../../verdaccio/stop.ts";

import { fmt, log, logStep, logWarning } from "../helpers/log.ts";
import { assertPackagesPublished } from "../helpers/registry.ts";
import { runScript } from "../helpers/shell.ts";
import { selectScenarioPaths } from "../helpers/select.ts";
import {
  discoverScenarioPaths,
  loadScenario,
  SCENARIOS_DIR,
  type Scenario,
} from "../helpers/scenario.ts";
import { prepareWorkspace, scenarioEnv } from "../helpers/workspace.ts";

/**
 * Run the acceptance scenarios.
 *
 * Verdaccio is started only if it is not already running, and stopped only if
 * we started it, so a registry someone is using for something else is left
 * alone. That mirrors `scripts/end-to-end`.
 */
export async function run(
  acceptanceDirectory: string,
  scenario: string | undefined,
): Promise<void> {
  const scenarioPaths = selectScenarioPaths(
    discoverScenarioPaths(SCENARIOS_DIR),
    scenario,
  );

  // Load every scenario before starting a registry: a typo in a scenario
  // should not cost a publish.
  const scenarios = scenarioPaths.map((scenarioPath) =>
    loadScenario(scenarioPath),
  );

  const alreadyRunning = isVerdaccioRunning();

  if (!alreadyRunning) {
    await verdaccioStart(true);
  }

  const failures: string[] = [];

  try {
    if (alreadyRunning) {
      logWarning(
        "A Verdaccio instance is already running, so its contents are used as they are.\n" +
          "  Nothing is published and nothing is checked; the scenarios may be testing\n" +
          "  whatever that registry happens to hold. Stop it first for a clean run:\n" +
          "    pnpm verdaccio stop",
      );
    } else {
      logStep("Publishing packages to Verdaccio");

      // `false` for noGitChecks, unlike end-to-end: the clean working tree
      // check is what makes "the committed code" true rather than assumed.
      verdaccioPublish(false, false);

      assertPackagesPublished();
    }

    for (const scenario of scenarios) {
      if (!runScenario(scenario, acceptanceDirectory)) {
        failures.push(scenario.slug);
      }
    }
  } finally {
    if (!alreadyRunning) {
      verdaccioStop();
    }
  }

  logStep("Summary");

  for (const { slug } of scenarios) {
    const failed = failures.includes(slug);

    log(
      `${failed ? fmt.fail("fail") : fmt.success("pass")}  ${fmt.scenario(slug)}`,
    );
  }

  if (failures.length > 0) {
    throw new Error(
      `${failures.length} of ${scenarios.length} scenarios failed: ${failures.join(", ")}`,
    );
  }
}

/**
 * Run one scenario, and report it. Returns whether it passed.
 *
 * Version one asserts nothing about the output: the script either runs to
 * completion and exits 0, or it fails and the output is what we show.
 */
function runScenario(scenario: Scenario, acceptanceDirectory: string): boolean {
  const { slug, script } = scenario;

  logStep(`Running ${slug}`);

  const workingDir = prepareWorkspace(acceptanceDirectory, slug);

  // The script lives beside the working directory rather than in it, so the
  // scenario runs in a directory holding nothing but its own .npmrc.
  const scriptPath = resolve(acceptanceDirectory, `${slug}.sh`);

  writeFileSync(scriptPath, `set -e\nexec 2>&1\n\n${script}\n`);

  const { exitCode, output } = runScript(scriptPath, workingDir, scenarioEnv());

  if (exitCode === 0) {
    log(`${fmt.success("passed")} ${fmt.scenario(slug)}`);

    return true;
  }

  log(`${fmt.fail("failed")} ${fmt.scenario(slug)} (exit code ${exitCode})`);
  log(fmt.deemphasize(`  script:  ${scriptPath}`));
  log(fmt.deemphasize(`  workdir: ${workingDir}`));
  console.log(output);

  return false;
}
