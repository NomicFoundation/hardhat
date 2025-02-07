import type {
  TestEventSource,
  TestReporterResult,
  TestStatus,
} from "./types.js";
import type { TestResult } from "@ignored/edr";

import { bytesToHexString } from "@ignored/hardhat-vnext-utils/hex";
import chalk from "chalk";

import {
  encodeStackTraceEntry,
  getMessageFromLastStackTraceEntry,
} from "../network-manager/edr/stack-traces/stack-trace-solidity-errors.js";

import { formatArtifactId } from "./formatters.js";

/**
 * This is a solidity test reporter. It is intended to be composed with the
 * solidity test runner's test stream. It was based on the hardhat node test
 * reporter's design.
 */
export async function* testReporter(
  source: TestEventSource,
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

        yield `Ran ${suiteResult.testResults.length} tests for ${formatArtifactId(suiteResult.id)}\n`;

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

          switch (status) {
            case "Success": {
              yield `${chalk.green("✔ Passed")}: ${name} ${chalk.grey(`(${details})`)}\n`;
              suiteSuccessCount++;
              break;
            }
            case "Failure": {
              failures.push(testResult);
              yield `${chalk.red(`✘ Failed(${failures.length})`)}: ${name} ${chalk.grey(`(${details})`)}\n`;
              suiteFailureCount++;
              break;
            }
            case "Skipped": {
              yield `${chalk.cyan(`- Skipped`)}: ${name}\n`;
              suiteSkippedCount++;
              break;
            }
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
      if (
        stackTrace !== undefined &&
        stackTrace !== null &&
        stackTrace.length > 0
      ) {
        const stackTraceMessage = getMessageFromLastStackTraceEntry(
          stackTrace[stackTrace.length - 1],
        );

        const stackTraceStack: string[] = [];
        for (const entry of stackTrace.reverse()) {
          const callsite = encodeStackTraceEntry(entry);
          if (callsite !== undefined) {
            stackTraceStack.push(`  at ${callsite.toString()}`);
          }
        }

        if (stackTraceMessage !== undefined || stackTraceStack.length > 0) {
          yield `${stackTraceMessage ?? "Stack trace:"}\n${chalk.grey(stackTraceStack.join("\n"))}\n`;
        }
      }

      if (
        failure.decodedLogs !== undefined &&
        failure.decodedLogs !== null &&
        failure.decodedLogs.length > 0
      ) {
        yield `Decoded Logs:\n${chalk.grey(failure.decodedLogs.map((log) => `  ${log}`).join("\n"))}\n`;
      }

      if (
        failure.reason !== undefined &&
        failure.reason !== null &&
        failure.reason !== ""
      ) {
        yield `Reason:\n${chalk.grey(`  ${failure.reason}`)}\n`;
      }

      if (
        failure.counterexample !== undefined &&
        failure.counterexample !== null
      ) {
        const counterexamples = Array.isArray(failure.counterexample)
          ? failure.counterexample
          : [failure.counterexample];

        for (const counterexample of counterexamples) {
          const details = Object.entries(counterexample)
            .map(
              ([key, value]) =>
                `  ${key}: ${Buffer.isBuffer(value) ? bytesToHexString(value) : value}`,
            )
          yield `Counterexample:\n${chalk.grey(details.join("\n"))}\n`;
        }
      }
    }
  }
}
