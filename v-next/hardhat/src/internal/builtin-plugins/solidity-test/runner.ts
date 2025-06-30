import type { TestEvent, TestsStream } from "./types.js";
import type {
  ArtifactId,
  Artifact,
  SolidityTestRunnerConfigArgs,
  TracingConfigWithBuffers,
} from "@ignored/edr";

import { Readable } from "node:stream";

import { runSolidityTests, EdrContext } from "@ignored/edr";
import { HardhatError } from "@nomicfoundation/hardhat-errors";

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
  tracingConfig: TracingConfigWithBuffers,
  sourceNameToUserSourceName: Map<string, string>,
  options?: RunOptions,
): TestsStream {
  const stream = new ReadableStream<TestEvent>({
    start(controller) {
      if (testSuiteIds.length === 0) {
        controller.close();
        return;
      }

      const remainingSuites = new Set(
        testSuiteIds.map((id) =>
          formatArtifactId(id, sourceNameToUserSourceName),
        ),
      );

      let timeout: NodeJS.Timeout | undefined;
      if (options?.timeout !== undefined) {
        timeout = setTimeout(() => {
          controller.error(
            new HardhatError(
              HardhatError.ERRORS.CORE.SOLIDITY_TESTS.RUNNER_TIMEOUT,
              {
                duration: options.timeout,
                suites: Array.from(remainingSuites).join(", "),
              },
            ),
          );
        }, options.timeout);
      }

      // TODO: Just getting the context here to get it initialized, but this
      // is not currently tied to the `runSolidityTests` function.
      getEdrContext();

      runSolidityTests(
        artifacts,
        testSuiteIds,
        configArgs,
        tracingConfig,
        (suiteResult) => {
          controller.enqueue({
            type: "suite:result",
            data: suiteResult,
          });
          remainingSuites.delete(
            formatArtifactId(suiteResult.id, sourceNameToUserSourceName),
          );
          if (remainingSuites.size === 0) {
            clearTimeout(timeout);
            controller.close();
          }
        },
        (error) => {
          clearTimeout(timeout);

          controller.error(
            new HardhatError(
              HardhatError.ERRORS.CORE.SOLIDITY_TESTS.UNHANDLED_EDR_ERROR_SOLIDITY_TESTS,
              {
                error: error.message,
              },
            ),
          );
        },
      );
    },
  });

  return Readable.from(stream);
}
