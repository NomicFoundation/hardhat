import type {
  TestEventSource,
  TestReporterResult,
  TestStatus,
} from "./types.js";
import type { TestResult } from "@ignored/edr-optimism";

import { bytesToHexString } from "@nomicfoundation/hardhat-utils/hex";
import chalk from "chalk";

import { encodeStackTraceEntry } from "../network-manager/edr/stack-traces/stack-trace-solidity-errors.js";

import { formatArtifactId, formatLogs, formatTraces } from "./formatters.js";
import { getMessageFromLastStackTraceEntry } from "./stack-trace-solidity-errors.js";

/**
 * This is a solidity test reporter. It is intended to be composed with the
 * solidity test runner's test stream. It was based on the hardhat node test
 * reporter's design.
 */
export async function* testReporter(
  source: TestEventSource,
  sourceNameToUserSourceName: Map<string, string>,
  verbosity: number,
): TestReporterResult {
  let runTestCount = 0;
  let runSuccessCount = 0;
  let runFailureCount = 0;
  let runSkippedCount = 0;
  let runDuration = 0n;

  const failures: TestResult[] = [];

  for await (const event of source) {
    switch (event.type) {
      case "suite:result": {
        const { data: suiteResult } = event;
        const suiteTestCount = suiteResult.testResults.length;

        if (suiteTestCount === 0) {
          continue;
        }

        let suiteSuccessCount = 0;
        let suiteFailureCount = 0;
        let suiteSkippedCount = 0;
        const suiteDuration = suiteResult.durationMs;

        yield `Ran ${suiteResult.testResults.length} tests for ${formatArtifactId(suiteResult.id, sourceNameToUserSourceName)}\n`;

        if (suiteResult.warnings.length > 0) {
          for (const warning of suiteResult.warnings) {
            yield `${chalk.yellow("Warning")}${chalk.grey(`: ${warning}`)}\n`;
          }
        }

        // NOTE: The test results are in reverse run order, so we reverse them
        // again to display them in the correct order.
        for (const testResult of suiteResult.testResults.reverse()) {
          const name = testResult.name;
          const status: TestStatus = testResult.status;
          const details = [
            ["duration", `${testResult.durationMs} ms`],
            ...Object.entries(testResult.kind),
          ]
            .map(
              ([key, value]) =>
                `${key}: ${Buffer.isBuffer(value) ? bytesToHexString(value) : value}`,
            )
            .join(", ");

          let printDecodedLogs = false;
          let printCallTraces = false;

          switch (status) {
            case "Success": {
              yield `${chalk.green("✔ Passed")}: ${name} ${chalk.grey(`(${details})`)}\n`;
              suiteSuccessCount++;
              if (verbosity >= 2) {
                printDecodedLogs = true;
              }
              if (verbosity >= 4) {
                printCallTraces = true;
              }
              break;
            }
            case "Failure": {
              failures.push(testResult);
              yield `${chalk.red(`✘ Failed(${failures.length})`)}: ${name} ${chalk.grey(`(${details})`)}\n`;
              suiteFailureCount++;
              if (verbosity >= 1) {
                printDecodedLogs = true;
              }
              if (verbosity >= 3) {
                printCallTraces = true;
              }
              break;
            }
            case "Skipped": {
              yield `${chalk.cyan(`- Skipped`)}: ${name}\n`;
              suiteSkippedCount++;
              break;
            }
          }

          let printExtraSpace = false;

          if (printDecodedLogs) {
            const decodedLogs = testResult.decodedLogs ?? [];
            if (decodedLogs.length > 0) {
              yield `Decoded Logs:\n${formatLogs(decodedLogs, 2)}\n`;
              printExtraSpace = true;
            }
          }

          if (printCallTraces) {
            const callTraces = testResult.callTraces();
            if (callTraces.length > 0) {
              yield `Call Traces:\n${formatTraces(callTraces, 2)}\n`;
              printExtraSpace = true;
            }
          }

          if (printExtraSpace) {
            yield "\n";
          }
        }

        const suiteSummary = `${suiteTestCount} tests, ${suiteSuccessCount} passed, ${suiteFailureCount} failed, ${suiteSkippedCount} skipped`;
        const suiteDetails = `duration: ${suiteDuration} ms`;

        if (suiteFailureCount === 0) {
          yield `${chalk.bold(chalk.green("✔ Suite Passed"))}: ${suiteSummary} ${chalk.grey(`(${suiteDetails})`)}\n`;
        } else {
          yield `${chalk.bold(chalk.red("✘ Suite Failed"))}: ${suiteSummary} ${chalk.grey(`(${suiteDetails})`)}\n`;
        }
        yield "\n";

        runTestCount += suiteTestCount;
        runSuccessCount += suiteSuccessCount;
        runFailureCount += suiteFailureCount;
        runSkippedCount += suiteSkippedCount;
        runDuration += suiteDuration;

        break;
      }
    }
  }

  const runSummary = `${runTestCount} tests, ${runSuccessCount} passed, ${runFailureCount} failed, ${runSkippedCount} skipped`;
  const runDetails = `duration: ${runDuration} ms`;
  if (runFailureCount !== 0) {
    yield `${chalk.bold(chalk.red("✘ Run Failed"))}: ${runSummary} ${chalk.grey(`(${runDetails})`)}\n`;
  } else {
    yield `${chalk.bold(chalk.green("✔ Run Passed"))}: ${runSummary} ${chalk.grey(`(${runDetails})`)}\n`;
  }

  if (failures.length > 0) {
    for (const [index, failure] of failures.entries()) {
      yield `\n${chalk.bold(chalk.red(`Failure (${index + 1})`))}: ${failure.name}\n`;

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

      yield `Reason: ${chalk.grey(reason)}\n`;

      // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check -- Ignore Cases not matched: undefined
      switch (stackTrace?.kind) {
        case "StackTrace":
          const stackTraceStack: string[] = [];
          for (const entry of stackTrace.entries.reverse()) {
            const callsite = encodeStackTraceEntry(entry);
            if (callsite !== undefined) {
              stackTraceStack.push(`  at ${callsite.toString()}`);
            }
          }

          if (stackTraceStack.length > 0) {
            yield `${chalk.grey(stackTraceStack.join("\n"))}\n`;
          }
          break;
        case "UnexpectedError":
          yield `Stack Trace Warning: ${chalk.grey(stackTrace.errorMessage)}\n`;
          break;
        case "UnsafeToReplay":
          if (stackTrace.globalForkLatest === true) {
            yield `Stack Trace Warning: ${chalk.grey("The test is not safe to replay because a fork url without a fork block number was provided.")}\n`;
          }
          if (stackTrace.impureCheatcodes.length > 0) {
            yield `Stack Trace Warning: ${chalk.grey(`The test is not safe to replay because it uses impure cheatcodes: ${stackTrace.impureCheatcodes.join(", ")}`)}\n`;
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
          const details = Object.entries(counterexample).map(
            ([key, value]) =>
              `  ${key}: ${Buffer.isBuffer(value) ? bytesToHexString(value) : value}`,
          );
          yield `Counterexample:\n${chalk.grey(details.join("\n"))}\n`;
        }
      }
    }
  }
}
