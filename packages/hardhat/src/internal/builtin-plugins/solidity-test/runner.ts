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
 * A single ill-formed inline-config entry reported by EDR, located so the
 * user can find and fix it. A discriminated union over `kind`: a
 * `source`-level entry carries no directive location, a `directive`-level
 * entry carries contract/function/line.
 *
 * EDR rejects `runSolidityTests` with an error carrying these on its
 * `inlineConfigErrors` property. The npm-pinned `@nomicfoundation/edr` types
 * don't declare these types yet, so we mirror them locally until a release
 * carrying them is pinned.
 */
type InlineConfigError = InlineConfigSourceError | InlineConfigDirectiveError;

/**
 * A source-level inline-config problem: one that could not be tied to a
 * single directive (e.g. an unsupported solc version or an unreadable
 * source).
 */
interface InlineConfigSourceError {
  kind: "source";
  sourceName: string;
  problem: InlineConfigSourceProblem;
}

/**
 * A directive-level inline-config problem, located at the offending
 * directive.
 */
interface InlineConfigDirectiveError {
  kind: "directive";
  sourceName: string;
  contract: string;
  function: string;
  line: number;
  problem: InlineConfigDirectiveProblem;
}

/**
 * A source-level problem, as a discriminated union over its `kind` tag. These
 * cannot be pinned to a single directive line, so they carry no line.
 */
type InlineConfigSourceProblem =
  | { kind: "InlineConfigInvalidSolcVersion" }
  | { kind: "InlineConfigSourceFileNotFound"; path: string; reason: string }
  | {
      kind: "InlineConfigDirectiveLocation";
      contract: string;
      function: string;
      reason: string;
    };

/**
 * The specific problem with an inline-config directive. Discriminated on its
 * `kind` tag.
 */
type InlineConfigDirectiveProblem =
  | { kind: "InlineConfigInvalidSyntax"; directive: string }
  | { kind: "InlineConfigUnsupportedProfile"; profile: string }
  | { kind: "InlineConfigInvalidKey"; key: string }
  | { kind: "InlineConfigInvalidKeyForTestType"; key: string; testType: string }
  | {
      kind: "InlineConfigInvalidValue";
      key: string;
      value: string;
      expected: string;
    }
  | { kind: "InlineConfigDuplicateKey"; key: string };

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

      // Inline-config parsing/validation failures are user errors that EDR
      // surfaces as structured, located problems. Report them as such instead
      // of as an unhandled EDR error.
      const inlineConfigErrors = getInlineConfigErrors(error);
      if (inlineConfigErrors !== undefined) {
        stream.destroy(
          new HardhatError(
            HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INVALID_INLINE_CONFIG,
            {
              errors: formatInlineConfigErrors(
                inlineConfigErrors,
                sourceNameToUserSourceName,
              ),
            },
          ),
        );
        return;
      }

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

/**
 * Returns the structured inline-config problems EDR attaches to a rejected
 * `runSolidityTests` promise, or `undefined` if the error isn't an
 * inline-config failure.
 */
function getInlineConfigErrors(error: Error): InlineConfigError[] | undefined {
  if (!("inlineConfigErrors" in error)) {
    return undefined;
  }

  const { inlineConfigErrors } = error;
  if (Array.isArray(inlineConfigErrors) && inlineConfigErrors.length > 0) {
    return inlineConfigErrors;
  }

  return undefined;
}

/**
 * Formats the inline-config problems into a human-readable, bulleted list,
 * mapping solc source names back to the user's source names where possible.
 */
function formatInlineConfigErrors(
  errors: InlineConfigError[],
  sourceNameToUserSourceName: Map<string, string>,
): string {
  return errors
    .map((error) => {
      const source =
        sourceNameToUserSourceName.get(error.sourceName) ?? error.sourceName;

      switch (error.kind) {
        case "source":
          return `- ${source}: ${formatInlineConfigSourceProblem(error.problem)}`;
        case "directive":
          return `- ${source}:${error.line} (${error.contract}.${error.function}): ${formatInlineConfigDirectiveProblem(error.problem)}`;
      }
    })
    .join("\n");
}

/**
 * Turns a structured source-level inline-config problem into a human-readable
 * message.
 */
function formatInlineConfigSourceProblem(
  problem: InlineConfigSourceProblem,
): string {
  switch (problem.kind) {
    case "InlineConfigInvalidSolcVersion":
      return `The source's solc version has no supported grammar, so its inline configuration could not be parsed.`;
    case "InlineConfigSourceFileNotFound":
      return `Could not read source file at "${problem.path}": ${problem.reason}.`;
    case "InlineConfigDirectiveLocation":
      return `Could not locate a directive of ${problem.contract}.${problem.function} within the source: ${problem.reason}.`;
  }
}

/**
 * Turns a structured directive-level inline-config problem into a
 * human-readable message.
 */
function formatInlineConfigDirectiveProblem(
  problem: InlineConfigDirectiveProblem,
): string {
  switch (problem.kind) {
    case "InlineConfigInvalidSyntax":
      return `Malformed directive "${problem.directive}". Expected "key = value".`;
    case "InlineConfigUnsupportedProfile":
      return `Unsupported profile "${problem.profile}". Only the "default" profile (or no profile) is supported.`;
    case "InlineConfigInvalidKey":
      return `Invalid config key "${problem.key}".`;
    case "InlineConfigInvalidKeyForTestType":
      return `Config key "${problem.key}" is not valid for ${problem.testType} tests.`;
    case "InlineConfigInvalidValue":
      return `Invalid value "${problem.value}" for config key "${problem.key}". Expected ${problem.expected}.`;
    case "InlineConfigDuplicateKey":
      return `Duplicate config key "${problem.key}".`;
  }
}
