import type { TestEvent, TestsStream } from "./types.js";
import type {
  ArtifactId,
  Artifact,
  SolidityTestRunnerConfigArgs,
} from "@ignored/edr";

import { Readable } from "node:stream";

import { runSolidityTests } from "@ignored/edr";

import { formatArtifactId } from "./formatters.js";

/**
 * Run all the given solidity tests and returns the stream of results.
 *
 * It returns a Readable stream that emits the test events similarly to how the
 * node test runner does it.
 *
 * The stream is closed when all the test suites have been run.
 *
 * This function, initially, was a direct port of the example v2 integration in
 * the EDR repo (see  https://github.com/NomicFoundation/edr/blob/feat/solidity-tests/js/helpers/src/index.ts).
 *
 * Despite the changes, the signature of the function should still be considered
 * a draft that may change in the future.
 *
 * TODO: Once the signature is finalised, give feedback to the EDR team.
 */
export function run(
  artifacts: Artifact[],
  testSuiteIds: ArtifactId[],
  configArgs: SolidityTestRunnerConfigArgs,
): TestsStream {
  const stream = new ReadableStream<TestEvent>({
    start(controller) {
      if (testSuiteIds.length === 0) {
        controller.close();
        return;
      }

      const remainingSuites = new Set(testSuiteIds.map(formatArtifactId));

      runSolidityTests(
        artifacts,
        testSuiteIds,
        configArgs,
        (suiteResult) => {
          controller.enqueue({
            type: "suite:result",
            data: suiteResult,
          });
          remainingSuites.delete(formatArtifactId(suiteResult.id));
          if (remainingSuites.size === 0) {
            controller.close();
          }
        },
        (error) => {
          controller.error(error);
        },
      );
    },
  });

  return Readable.from(stream);
}
