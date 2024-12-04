import type { TestEvent, TestsStream } from "./types.js";
import type {
  ArtifactId,
  Artifact,
  SolidityTestRunnerConfigArgs,
} from "@ignored/edr";

import { Readable } from "node:stream";

import { runSolidityTests, EdrContext } from "@ignored/edr";
import { HardhatError } from "@ignored/hardhat-vnext-errors";

import { formatArtifactId } from "./formatters.js";

let edrContext: EdrContext | undefined;

function getEdrContext(): EdrContext {
  if (edrContext === undefined) {
    edrContext = new EdrContext();
  }

  return edrContext;
}

export interface RunOptions {
  /**
   * The maximum time in milliseconds to wait for all the test suites to finish.
   *
   * If not provided, the default is 1 hour.
   */
  timeout?: number;
}

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
  options?: RunOptions,
): TestsStream {
  const stream = new ReadableStream<TestEvent>({
    start(controller) {
      if (testSuiteIds.length === 0) {
        controller.close();
        return;
      }

      const remainingSuites = new Set(testSuiteIds.map(formatArtifactId));

      // NOTE: The timeout prevents the situation in which the stream is never
      // closed. This can happen if we receive fewer suite results than the
      // number of test suites. The timeout is set to 1 hour.
      const duration = options?.timeout ?? 60 * 60 * 1000;
      const timeout = setTimeout(() => {
        controller.error(
          new HardhatError(HardhatError.ERRORS.SOLIDITY_TESTS.RUNNER_TIMEOUT, {
            duration,
            suites: Array.from(remainingSuites).join(", "),
          }),
        );
      }, duration);

      // TODO: Just getting the context here to get it initialized, but this
      // is not currently tied to the `runSolidityTests` function.
      getEdrContext();

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
            clearTimeout(timeout);
            controller.close();
          }
        },
        (error) => {
          clearTimeout(timeout);
          controller.error(error);
        },
      );
    },
  });

  return Readable.from(stream);
}
