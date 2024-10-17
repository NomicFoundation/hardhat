import type { NewTaskActionFunction } from "../../../types/tasks.js";

import { spec } from "node:test/reporters";

import {
  getArtifacts,
  isTestArtifact,
  runAllSolidityTests,
} from "./helpers.js";

const runSolidityTests: NewTaskActionFunction = async (_arguments, hre) => {
  await hre.tasks.getTask("compile").run({ quiet: false });

  console.log("\nRunning Solidity tests...\n");

  const specReporter = new spec();

  specReporter.pipe(process.stdout);

  let totalTests = 0;
  let failedTests = 0;

  const artifacts = await getArtifacts(hre.artifacts);
  const testSuiteIds = (
    await Promise.all(
      artifacts.map(async (artifact) => {
        if (await isTestArtifact(hre.config.paths.root, artifact)) {
          return artifact.id;
        }
      }),
    )
  ).filter((artifact) => artifact !== undefined);

  const config = {
    projectRoot: hre.config.paths.root,
  };

  await runAllSolidityTests(
    artifacts,
    testSuiteIds,
    config,
    (suiteResult, testResult) => {
      let name = suiteResult.id.name + " | " + testResult.name;
      if ("runs" in testResult?.kind) {
        name += ` (${testResult.kind.runs} runs)`;
      }

      totalTests++;

      const failed = testResult.status === "Failure";
      if (failed) {
        failedTests++;
      }

      specReporter.write({
        type: failed ? "test:fail" : "test:pass",
        data: {
          name,
        },
      });
    },
  );

  console.log(`\n${totalTests} tests found, ${failedTests} failed`);

  if (failedTests > 0) {
    process.exitCode = 1;
    return;
  }
};

export default runSolidityTests;
