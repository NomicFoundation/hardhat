import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { isVerdaccioRunning } from "../../verdaccio/helpers/shell.ts";
import { publish as verdaccioPublish } from "../../verdaccio/publish.ts";
import { start as verdaccioStart } from "../../verdaccio/start.ts";
import { stop as verdaccioStop } from "../../verdaccio/stop.ts";

import { fmt, log, logStep, logWarning } from "../helpers/log.ts";
import { assertPackagesPublished } from "../helpers/registry.ts";
import {
  runScript,
  scenarioScript,
  SHELL_OPTIONS,
  TRACE_PREFIX,
  tracedCommands,
} from "../helpers/shell.ts";
import { selectScenarioPaths } from "../helpers/select.ts";
import {
  type Cell,
  discoverScenarioPaths,
  loadScenario,
  SCENARIOS_DIR,
  scenarioCells,
} from "../helpers/scenario.ts";
import {
  clearScenarioDirectory,
  prepareCaches,
  prepareWorkspace,
  scenarioEnv,
} from "../helpers/workspace.ts";

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
  noGitChecks: boolean,
  forcePublishAll: boolean,
): Promise<void> {
  const scenarioPaths = selectScenarioPaths(
    discoverScenarioPaths(SCENARIOS_DIR),
    scenario,
  );

  // Load and expand every scenario before starting a registry: a typo in a
  // scenario should not cost a publish.
  const cells = scenarioPaths.flatMap((scenarioPath) =>
    scenarioCells(loadScenario(scenarioPath)),
  );

  // Force-publishing needs a registry started in overriding mode, so it never
  // adopts one that is already running - that instance would be proxying npm
  // and the publish would be refused for versions npm already has.
  const reuseRunning = isVerdaccioRunning() && !forcePublishAll;

  if (!reuseRunning) {
    await verdaccioStart(true, forcePublishAll);
  }

  const failures: string[] = [];

  try {
    if (reuseRunning) {
      logWarning(
        "A Verdaccio instance is already running, so its contents are used as they are.\n" +
          "  Nothing is published and nothing is checked; the scenarios may be testing\n" +
          "  whatever that registry happens to hold. Stop it first for a clean run:\n" +
          "    pnpm verdaccio stop",
      );
    } else {
      logStep("Publishing packages to Verdaccio");

      if (forcePublishAll) {
        log(
          "--force-publish-all: this registry serves the packages built here and nothing\n" +
            "  else, so every one of them is published regardless of what npm holds.",
        );
      }

      if (noGitChecks) {
        logWarning(
          "--no-git-checks: publishing the working tree, uncommitted changes and all.\n" +
            "  The scenarios then test what is on disk rather than what is committed.",
        );
      }

      // Unlike end-to-end, which always skips it, the clean working tree check
      // is on by default here: it is what makes "the committed code" true
      // rather than assumed. --no-git-checks is the deliberate way out.
      verdaccioPublish(false, noGitChecks, forcePublishAll);

      assertPackagesPublished();
    }

    const cacheDir = prepareCaches(acceptanceDirectory);

    for (const slug of new Set(cells.map((cell) => cell.slug))) {
      clearScenarioDirectory(acceptanceDirectory, slug);
    }

    for (const cell of cells) {
      if (!runCell(cell, acceptanceDirectory, cacheDir)) {
        failures.push(cell.label);
      }
    }
  } finally {
    if (!reuseRunning) {
      verdaccioStop();
    }
  }

  logStep("Summary");

  for (const { label } of cells) {
    const failed = failures.includes(label);

    log(
      `${failed ? fmt.fail("fail") : fmt.success("pass")}  ${fmt.scenario(label)}`,
    );
  }

  if (failures.length > 0) {
    throw new Error(
      `${failures.length} of ${cells.length} runs failed: ${failures.join(", ")}`,
    );
  }
}

/**
 * Run one cell, and report it. Returns whether it passed.
 *
 * Version one asserts nothing about the output: the script either runs to
 * completion and exits 0, or it fails and the output is what we show. Either
 * way the commands it ran are printed as a user would type them, expanded.
 */
function runCell(
  cell: Cell,
  acceptanceDirectory: string,
  cacheDir: string,
): boolean {
  const { label, directory, script } = cell;

  logStep(`Running ${label}`);

  const workingDir = prepareWorkspace(acceptanceDirectory, cell);

  // The script lives beside the working directory rather than in it, so the
  // scenario runs in a directory holding nothing but its registry config.
  const scriptPath = resolve(acceptanceDirectory, `${directory}.sh`);

  writeFileSync(scriptPath, scenarioScript(script));

  const { exitCode, output } = runScript(
    scriptPath,
    workingDir,
    scenarioEnv(cacheDir),
  );

  if (exitCode === 0) {
    for (const command of tracedCommands(output)) {
      console.log(fmt.deemphasize(`${TRACE_PREFIX}${command}`));
    }

    log(`${fmt.success("passed")} ${fmt.scenario(label)}`);

    return true;
  }

  console.log(output);
  log(`${fmt.fail("failed")} ${fmt.scenario(label)} (exit code ${exitCode})`);
  log(fmt.deemphasize(`  script:  ${scriptPath} (${SHELL_OPTIONS})`));
  log(fmt.deemphasize(`  workdir: ${workingDir}`));

  return false;
}
