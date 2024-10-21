import type { RunOptions } from "./runner.js";
import type { TestEvent } from "./types.js";
import type { NewTaskActionFunction } from "../../../types/tasks.js";
import type { SolidityTestRunnerConfigArgs } from "@ignored/edr";

import { finished } from "node:stream/promises";

import { getArtifacts, isTestArtifact } from "./helpers.js";
import { testReporter } from "./reporter.js";
import { run } from "./runner.js";

const runSolidityTests: NewTaskActionFunction = async (_taskArguments, hre) => {
  await hre.tasks.getTask("compile").run({ quiet: false });

  console.log("\nRunning Solidity tests...\n");

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

  let includesFailures = false;
  let includesErrors = false;

  const profileName = hre.globalOptions.buildProfile;
  const profile = hre.config.solidity.profiles[profileName];
  const testOptions = profile.test;

  const config: SolidityTestRunnerConfigArgs = {
    projectRoot: hre.config.paths.root,
    ...testOptions,
  };

  const options: RunOptions = testOptions;

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
