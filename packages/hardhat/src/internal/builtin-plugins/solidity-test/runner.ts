import type { TestEvent, TestsStream } from "./types.js";
import type { ChainType } from "../../../types/network.js";
import type {
  ArtifactId,
  EdrContext,
  InlineConfigError,
  SolidityTestResult,
  SolidityTestRunnerConfigArgs,
  SuiteResult,
} from "@nomicfoundation/edr";

import { Readable } from "node:stream";

import {
  HardhatError,
  assertHardhatInvariant,
} from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";

import { hardhatChainTypeToEdrChainType } from "../../edr/chain-type.js";
import { getGlobalEdrContext } from "../../edr/context.js";

import { formatArtifactId, formatInlineConfigErrors } from "./formatters.js";

/**
 * A reference to a test suite contract within an artifacts directory, as
 * accepted by EDR's `runSolidityTestsFromPaths`.
 */
interface TestSuiteReference {
  source: string;
  name: string;
}

/**
 * `EdrContext` extended with the path-based test runner entry point.
 *
 * This is declared locally (instead of using the `@nomicfoundation/edr`
 * typings) because this branch is compiled against the published EDR, which
 * doesn't have the API yet; at runtime the locally-built EDR provides it.
 * TODO: Drop this and use the EDR typings once a version with
 * `runSolidityTestsFromPaths` is published.
 */
type EdrContextWithFromPaths = EdrContext & {
  runSolidityTestsFromPaths?: (
    chainType: string,
    artifactsDirectories: string[],
    testSuites: TestSuiteReference[],
    configArgs: SolidityTestRunnerConfigArgs,
    onTestSuiteCompletedCallback: (result: SuiteResult) => void,
  ) => Promise<SolidityTestResult>;
};

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
  artifactsDirectories: string[],
  testSuiteIds: ArtifactId[],
  testRunnerConfig: SolidityTestRunnerConfigArgs,
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
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- See EdrContextWithFromPaths: the API exists at runtime but not in the
      published typings this branch compiles against. */
      const edrContext =
        (await getGlobalEdrContext()) as EdrContextWithFromPaths;

      assertHardhatInvariant(
        edrContext.runSolidityTestsFromPaths !== undefined,
        "The EDR version in use doesn't support runSolidityTestsFromPaths",
      );

      const solidityTestResult = await edrContext.runSolidityTestsFromPaths(
        hardhatChainTypeToEdrChainType(chainType),
        artifactsDirectories,
        // EDR loads the artifacts and build infos from disk and resolves
        // these references against them, so neither the artifact contents
        // nor the tracing config buffers cross N-API anymore.
        testSuiteIds.map(({ source, name }) => ({ source, name })),
        testRunnerConfig,
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

      // EDR reports the problems it found in the user's inline test config as
      // an `inlineConfigErrors` property on the error. Report them as a
      // dedicated Hardhat error instead of an unhandled EDR error.
      if (hasInlineConfigErrors(error)) {
        stream.destroy(
          new HardhatError(
            HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INVALID_INLINE_CONFIG,
            {
              errors: formatInlineConfigErrors(
                error.inlineConfigErrors,
                sourceNameToUserSourceName,
              ),
            },
          ),
        );
        return;
      }

      stream.destroy(
        new HardhatError(
          HardhatError.ERRORS.CORE.SOLIDITY_TESTS
            .UNHANDLED_EDR_ERROR_SOLIDITY_TESTS,
          {
            error: error.message,
          },
        ),
      );
    }
  })();

  return stream;
}

/**
 * EDR attaches the structured inline-config problems to the error that rejects
 * `runSolidityTests`, but as a property of an `Error` rather than a typed
 * error class, so we have to assert their type here.
 */
function hasInlineConfigErrors(
  error: Error,
): error is Error & { inlineConfigErrors: InlineConfigError[] } {
  return (
    "inlineConfigErrors" in error && Array.isArray(error.inlineConfigErrors)
  );
}
