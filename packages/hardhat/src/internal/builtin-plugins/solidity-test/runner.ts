import type { TestEvent, TestsStream } from "./types.js";
import type { ChainType } from "../../../types/network.js";
import type {
  ArtifactId,
  Artifact,
  SolidityTestRunnerConfigArgs,
  TracingConfigWithBuffers,
} from "@nomicfoundation/edr";

import { Readable } from "node:stream";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";

import { hardhatChainTypeToEdrChainType } from "../../edr/chain-type.js";
import { getGlobalEdrContext } from "../../edr/context.js";

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
 * the EDR repo (see  https://github.com/NomicFoundation/edr/blob/main/js/helpers/src/index.ts).
 *
 * Despite the changes, the signature of the function should still be considered
 * a draft that may change in the future.
 *
 * Important TODO: Transform this into an AsyncGenerator<SuiteResult, SolidityTestResult, void>
 */
export function run(
  chainType: ChainType,
  artifacts: Artifact[],
  testSuiteIds: ArtifactId[],
  testRunnerConfig: SolidityTestRunnerConfigArgs,
  tracingConfig: TracingConfigWithBuffers,
  sourceNameToUserSourceName: Map<string, string>,
): TestsStream {
  const stream = new Readable({
    objectMode: true,
    read() {},
  });

  if (testSuiteIds.length === 0) {
    stream.push(null);
    return stream;
  }

  let runCompleted = false;

  const remainingSuites = new Set(
    testSuiteIds.map((id) => formatArtifactId(id, sourceNameToUserSourceName)),
  );

  // Start the async work immediately. The read() callback is a no-op
  // because we push data proactively from the EDR suite-completion
  // callback. Using a native Readable (instead of a web ReadableStream
  // wrapped with Readable.from) avoids a race where Node.js stream
  // cleanup cancels the web reader while the async start callback still
  // has pending work — push() on a destroyed Readable is a safe no-op.
  // TODO: Add support for predeploys once EDR supports them.
  void (async () => {
    try {
      const edrContext = await getGlobalEdrContext();
      const solidityTestResult = await edrContext.runSolidityTests(
        hardhatChainTypeToEdrChainType(chainType),
        artifacts,
        testSuiteIds,
        testRunnerConfig,
        tracingConfig,
        (suiteResult) => {
          stream.push({
            type: "suite:done",
            data: suiteResult,
          } satisfies TestEvent);
          remainingSuites.delete(
            formatArtifactId(suiteResult.id, sourceNameToUserSourceName),
          );
          if (remainingSuites.size === 0) {
            if (runCompleted) {
              stream.push(null);
            }
          }
        },
      );
      stream.push({
        type: "run:done",
        data: solidityTestResult,
      } satisfies TestEvent);
      runCompleted = true;

      if (remainingSuites.size === 0) {
        stream.push(null);
      }
    } catch (error) {
      ensureError(error);

      stream.destroy(
        new HardhatError(
          HardhatError.ERRORS.CORE.SOLIDITY_TESTS.UNHANDLED_EDR_ERROR_SOLIDITY_TESTS,
          {
            error: error.message,
          },
        ),
      );
    }
  })();

  return stream;
}
