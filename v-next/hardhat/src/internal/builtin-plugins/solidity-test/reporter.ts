import type {
  TestEventSource,
  TestReporterResult,
  TestStatus,
} from "./types.js";
import type { TestResult } from "@ignored/edr-optimism";

import { bytesToHexString } from "@nomicfoundation/hardhat-utils/hex";
import chalk from "chalk";

import { sendErrorTelemetry } from "../../cli/telemetry/sentry/reporter.js";
import { SolidityTestStackTraceGenerationError } from "../network-manager/edr/stack-traces/stack-trace-generation-errors.js";
import { encodeStackTraceEntry } from "../network-manager/edr/stack-traces/stack-trace-solidity-errors.js";

import {
  type Colorizer,
  formatArtifactId,
  formatTraces,
} from "./formatters.js";
import { getMessageFromLastStackTraceEntry } from "./stack-trace-solidity-errors.js";

class Indenter {
  #indentation: number;

  constructor() {
    this.#indentation = 2;
  }

  public inc(): void {
    this.#indentation += 2;
  }

  public dec(): void {
    this.#indentation = Math.max(0, this.#indentation - 2);
  }

  public prefix(): string {
    return " ".repeat(this.#indentation);
  }

  public t(strings: TemplateStringsArray, ...values: any[]): string {
    const line = strings.reduce(
      (acc, str, i) => acc + str + (values[i] ?? ""),
      "",
    );
    return this.prefix() + line;
  }
}

/**
 * This is a solidity test reporter. It is intended to be composed with the
 * solidity test runner's test stream. It was based on the hardhat node test
 * reporter's design.
 */
export async function* testReporter(
  source: TestEventSource,
  sourceNameToUserSourceName: Map<string, string>,
  verbosity: number,
  colorizer: Colorizer = chalk,
): TestReporterResult {
  let runSuccessCount = 0;
  let runFailureCount = 0;
  let runSkippedCount = 0;

  const failures: Array<{
    testResult: TestResult;
    formattedArtifactId: string;
  }> = [];

  const indenter = new Indenter();

  let firstSuite = true;
  for await (const event of source) {
    switch (event.type) {
      case "suite:result": {
        const { data: suiteResult } = event;
        const suiteTestCount = suiteResult.testResults.length;

        if (suiteTestCount === 0) {
          continue;
        }

        if (firstSuite) {
          firstSuite = false;
        } else {
          yield "\n";
        }

        let suiteSuccessCount = 0;
        let suiteSkippedCount = 0;

        const formattedArtifactId = formatArtifactId(
          suiteResult.id,
          sourceNameToUserSourceName,
        );
        yield indenter.t`${formattedArtifactId}\n`;

        if (suiteResult.warnings.length > 0) {
          indenter.inc();
          for (const warning of suiteResult.warnings) {
            yield indenter.t`${colorizer.yellow("Warning")}${colorizer.grey(`: ${warning}`)}\n`;
          }
          indenter.dec();
          yield "\n";
        }

        indenter.inc();
        // NOTE: The test results are in reverse run order, so we reverse them
        // again to display them in the correct order.
        for (const [testIndex, testResult] of suiteResult.testResults
          .reverse()
          .entries()) {
          const name = testResult.name;
          const status: TestStatus = testResult.status;
          let details = "";
          const detailsItems = [];
          for (const [key, value] of Object.entries(testResult.kind)) {
            if (key === "runs") {
              detailsItems.push(`runs: ${value}`);
            }
          }
          if (detailsItems.length > 0) {
            details = ` (${detailsItems.join(", ")})`;
          }

          const printDecodedLogs =
            (status === "Success" && verbosity >= 2) ||
            (status === "Failure" && verbosity >= 1);
          let printSetUpTraces = false;
          let printExecutionTraces = false;

          if (printDecodedLogs) {
            const decodedLogs = testResult.decodedLogs ?? [];
            for (const log of decodedLogs) {
              yield `${log}\n`;
            }
          }

          switch (status) {
            case "Success": {
              let successOutput = colorizer.green(`✔ ${name}`);
              if (details !== "") {
                successOutput += colorizer.dim(details);
              }
              yield indenter.t`${successOutput}\n`;
              suiteSuccessCount++;
              if (verbosity >= 5) {
                printSetUpTraces = true;
                printExecutionTraces = true;
              }
              break;
            }
            case "Failure": {
              failures.push({ testResult, formattedArtifactId });
              runFailureCount++;
              yield indenter.t`${colorizer.red(`${runFailureCount}) ${name}`)}\n`;
              if (verbosity >= 3) {
                printExecutionTraces = true;
              }
              if (verbosity >= 4) {
                printSetUpTraces = true;
              }
              break;
            }
            case "Skipped": {
              yield indenter.t`${colorizer.cyan(`- ${name}`)}\n`;
              suiteSkippedCount++;
              break;
            }
          }

          let printExtraSpace = false;

          if (printSetUpTraces || printExecutionTraces) {
            const callTraces = testResult.callTraces().filter(({ inputs }) => {
              if (printSetUpTraces && printExecutionTraces) {
                return true;
              }
              let functionName: string | undefined;
              if (!(inputs instanceof Uint8Array)) {
                functionName = inputs.name;
              }
              if (printSetUpTraces && functionName === "setUp") {
                return true;
              }
              if (printExecutionTraces && functionName !== "setUp()") {
                return true;
              }
              return false;
            });

            if (callTraces.length > 0) {
              indenter.inc();
              yield indenter.t`Call Traces:\n`;
              indenter.inc();
              yield `${formatTraces(callTraces, indenter.prefix(), colorizer)}\n`;
              indenter.dec();
              indenter.dec();
              if (testIndex < suiteResult.testResults.length - 1) {
                printExtraSpace = true;
              }
            }
          }

          if (printExtraSpace) {
            yield "\n";
          }
        }
        indenter.dec();

        runSuccessCount += suiteSuccessCount;
        runSkippedCount += suiteSkippedCount;

        break;
      }
    }
  }

  yield "\n";
  yield "\n";
  yield indenter.t`${colorizer.green(`${runSuccessCount} passing`)}\n`;
  if (runFailureCount > 0) {
    yield indenter.t`${colorizer.red(`${runFailureCount} failing`)}\n`;
  }
  if (runSkippedCount > 0) {
    yield indenter.t`${colorizer.cyan(`${runSkippedCount} skipped`)}\n`;
  }

  const failuresByArtifactId = new Map<string, TestResult[]>();
  for (const { testResult, formattedArtifactId } of failures) {
    const artifactFailures =
      failuresByArtifactId.get(formattedArtifactId) ?? [];
    artifactFailures.push(testResult);
    failuresByArtifactId.set(formattedArtifactId, artifactFailures);
  }

  let failureIndex = 1;
  if (failures.length > 0) {
    yield "\n";
    let firstSuiteWithFailures = true;
    for (const [artifactId, artifactFailures] of failuresByArtifactId) {
      if (!firstSuiteWithFailures) {
        yield "\n";
      }
      firstSuiteWithFailures = false;

      yield indenter.t`${artifactId}\n`;
      indenter.inc();
      let firstFailure = true;
      for (const failure of artifactFailures) {
        if (!firstFailure) {
          yield "\n";
        }
        firstFailure = false;

        yield indenter.t`${failureIndex}) ${failure.name}\n`;
        failureIndex++;

        indenter.inc();
        const stackTrace = failure.stackTrace();
        let reason: string | undefined;
        if (stackTrace?.kind === "StackTrace") {
          reason = getMessageFromLastStackTraceEntry(
            stackTrace.entries[stackTrace.entries.length - 1],
          );
        }
        if (reason === undefined || reason === "") {
          reason = failure.reason ?? "Unknown error";
        }
        yield indenter.t`${colorizer.red(`Error: ${reason}`)}\n`;
        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check -- Ignore Cases not matched: undefined
        switch (stackTrace?.kind) {
          case "StackTrace":
            const stackTraceStack: string[] = [];
            for (const entry of stackTrace.entries.reverse()) {
              const callsite = encodeStackTraceEntry(entry);
              if (callsite !== undefined) {
                indenter.inc();
                stackTraceStack.push(indenter.t`at ${callsite.toString()}`);
                indenter.dec();
              }
            }
            if (stackTraceStack.length > 0) {
              yield `${colorizer.grey(stackTraceStack.join("\n"))}\n`;
            }
            yield "\n";
            break;
          case "UnexpectedError":
            await sendErrorTelemetry(
              new SolidityTestStackTraceGenerationError(
                stackTrace.errorMessage,
              ),
            );
            yield indenter.t`Stack Trace Warning: ${colorizer.grey(stackTrace.errorMessage)}\n`;
            break;
          case "UnsafeToReplay":
            if (stackTrace.globalForkLatest === true) {
              yield indenter.t`Stack Trace Warning: ${colorizer.grey("The test is not safe to replay because a fork url without a fork block number was provided.")}\n`;
            }
            if (stackTrace.impureCheatcodes.length > 0) {
              yield indenter.t`Stack Trace Warning: ${colorizer.grey(`The test is not safe to replay because it uses impure cheatcodes: ${stackTrace.impureCheatcodes.join(", ")}`)}\n`;
            }
            break;
          case "HeuristicFailed":
          default:
            break;
        }
        if (
          failure.counterexample !== undefined &&
          failure.counterexample !== null
        ) {
          const counterexamples =
            "sequence" in failure.counterexample
              ? failure.counterexample.sequence
              : [failure.counterexample];
          for (const counterexample of counterexamples) {
            yield indenter.t`Counterexample:\n`;
            indenter.inc();
            for (const [key, value] of Object.entries(counterexample)) {
              const counterExampleDetails = `${key}: ${Buffer.isBuffer(value) ? bytesToHexString(value) : value}`;
              yield indenter.t`${colorizer.grey(counterExampleDetails)}\n`;
            }
            indenter.dec();
          }
        }
        indenter.dec();
      }
      indenter.dec();
    }
  }
}
