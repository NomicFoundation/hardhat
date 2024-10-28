import type { RunOptions } from "./runner.js";
import type { TestEvent } from "./types.js";
import type { NewTaskActionFunction } from "../../../types/tasks.js";

import { finished } from "node:stream/promises";

import { createNonClosingWriter } from "@ignored/hardhat-vnext-utils/stream";

import { getArtifacts, isTestArtifact } from "./helpers.js";
import { testReporter } from "./reporter.js";
import { run } from "./runner.js";

interface TestActionArguments {
  timeout: number;
  noCompile: boolean;
}

const runSolidityTests: NewTaskActionFunction<TestActionArguments> = async (
  { timeout, noCompile },
  hre,
) => {
  if (!noCompile) {
    await hre.tasks.getTask("compile").run({ quiet: true });
  }

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

  let includesFailures = false;
  let includesErrors = false;

  const options: RunOptions = { timeout };

  const runStream = run(artifacts, testSuiteIds, config, options);

  const testReporterStream = runStream
    .on("data", (event: TestEvent) => {
      if (event.type === "suite:result") {
        if (event.data.testResults.some(({ status }) => status === "Failure")) {
          includesFailures = true;
        }
      }
    })
    .compose(testReporter);

  const outputStream = testReporterStream.pipe(
    createNonClosingWriter(process.stdout),
  );

  try {
    // NOTE: We're awaiting the original run stream to finish to catch any
    // errors produced by the runner.
    await finished(runStream);

    // We also await the output stream to finish, as we want to wait for it
    // to avoid returning before the whole output was generated.
    await finished(outputStream);
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
