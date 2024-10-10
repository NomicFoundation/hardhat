import type { TestEvent } from "./types.js";
import type { NewTaskActionFunction } from "../../../types/tasks.js";

import { finished } from "node:stream/promises";

import { buildSolidityTestsInput } from "./helpers.js";
import { testReporter } from "./reporter.js";
import { run } from "./runner.js";

const runSolidityTests: NewTaskActionFunction = async (_arguments, hre) => {
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

  const reporterStream = run(artifacts, testSuiteIds, config)
    .on("data", (event: TestEvent) => {
      if (event.type === "suite:result") {
        if (event.data.testResults.some(({ status }) => status === "Failure")) {
          includesFailures = true;
        }
      }
    })
    .compose(testReporter);

  reporterStream.pipe(process.stdout);

  // NOTE: If the stream does not end (e.g. if EDR does not report on all the
  // test suites), this promise is never resolved but the process will happily
  // exit with a zero exit code without continuing past this point 😕
  await finished(reporterStream);

  if (includesFailures) {
    process.exitCode = 1;
    return;
  }
};

export default runSolidityTests;
