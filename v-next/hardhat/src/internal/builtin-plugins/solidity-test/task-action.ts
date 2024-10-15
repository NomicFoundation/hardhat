import type { RunOptions } from "./runner.js";
import type { TestEvent } from "./types.js";
import type { NewTaskActionFunction } from "../../../types/tasks.js";

import { finished } from "node:stream/promises";

import { buildSolidityTestsInput } from "./helpers.js";
import { testReporter } from "./reporter.js";
import { run } from "./runner.js";

const runSolidityTests: NewTaskActionFunction = async ({ timeout }, hre) => {
  await hre.tasks.getTask("compile").run({ quiet: false });

  console.log("\nRunning Solidity tests...\n");

  const { artifacts, testSuiteIds } = await buildSolidityTestsInput(
    hre.artifacts,
    (artifact) => {
      const sourceName = artifact.id.source;
      const isTestArtifact =
        sourceName.endsWith(".t.sol") &&
        sourceName.startsWith("contracts/") &&
        !sourceName.startsWith("contracts/forge-std/") &&
        !sourceName.startsWith("contracts/ds-test/");

      return isTestArtifact;
    },
  );

  const config = {
    projectRoot: hre.config.paths.root,
  };

  let includesFailures = false;
  let includesErrors = false;

  const options: RunOptions = { timeout };

  const runStream = run(artifacts, testSuiteIds, config, options);

  runStream
    .on("data", (event: TestEvent) => {
      if (event.type === "suite:result") {
        if (event.data.testResults.some(({ status }) => status === "Failure")) {
          includesFailures = true;
        }
      }
    })
    .compose(testReporter)
    .pipe(process.stdout);

  // NOTE: We're awaiting the original run stream to finish instead of the
  // composed reporter stream to catch any errors produced by the runner.
  try {
    await finished(runStream);
  } catch (error) {
    console.error(error);
    includesErrors = true;
  }

  if (includesFailures || includesErrors) {
    process.exitCode = 1;
    return;
  }
};

export default runSolidityTests;
