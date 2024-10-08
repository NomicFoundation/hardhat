import type {
  TestEventSource,
  TestReporterResult,
  TestStatus,
} from "./types.js";
import type { TestResult } from "@ignored/edr";

import chalk from "chalk";

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

        yield `Ran ${suiteResult.testResults.length} tests for ${suiteResult.id.source}:${suiteResult.id.name}\n`;

        if (suiteResult.warnings.length > 0) {
          for (const warning of suiteResult.warnings) {
            yield `${chalk.yellow("⚠️ Warning")}${chalk.grey(`: ${warning}`)}\n`;
          }
        }

        for (const testResult of suiteResult.testResults) {
          const name = testResult.name;
          const status: TestStatus = testResult.status;
          const details = [
            ["duration", `${testResult.durationMs} ms`],
            ...Object.entries(testResult.kind),
          ]
            .map(([key, value]) => `${key}: ${value}`)
            .join(", ");

          switch (status) {
            case "Success": {
              yield `${chalk.green("✔ Passed")}: ${name} ${chalk.grey(`(${details})`)}\n`;
              suiteSuccessCount++;
              break;
            }
            case "Failure": {
              failures.push(testResult);
              yield `${chalk.red(`✖️ Failed(${failures.length})`)}: ${name} ${chalk.grey(`(${details})`)}\n`;
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
          yield `${chalk.green("✔ Suite Passed")}: ${suiteSummary} ${chalk.grey(`(${suiteDetails})`)}\n`;
        } else {
          yield `${chalk.red("✖️ Suite Failed")}: ${suiteSummary} ${chalk.grey(`(${suiteDetails})`)}\n`;
        }
        yield "\n";

        runTestCount += suiteTestCount;
        runSuccessCount += suiteSuccessCount;
        runFailureCount += suiteFailureCount;
        runSkippedCount += suiteSkippedCount;
        runDuration += suiteDuration;

        break;
      }
      case "test:complete": {
        const runSummary = `${runTestCount} tests, ${runSuccessCount} passed, ${runFailureCount} failed, ${runSkippedCount} skipped`;
        const runDetails = `duration: ${runDuration} ms`;

        if (runFailureCount !== 0) {
          yield `${chalk.red("✖️ Run Failed")}: ${runSummary} ${chalk.grey(`(${runDetails})`)}\n`;
        } else {
          yield `${chalk.green("✔ Run Passed")}: ${runSummary} ${chalk.grey(`(${runDetails})`)}\n`;
        }

        if (failures.length > 0) {
          for (const [index, failure] of failures.entries()) {
            yield `\n${chalk.red(`✖️ Failure (${index + 1})`)}: ${failure.name}\n`;

            if (failure.decodedLogs !== undefined) {
              yield `\nDecoded Logs${chalk.grey(`: ${failure.decodedLogs.join("\n")}\n`)}`;
            }

            if (failure.reason !== undefined) {
              yield `\nReason${chalk.grey(`: ${failure.reason}\n`)}`;
            }

            if (failure.counterexample !== undefined) {
              const counterexamples = Array.isArray(failure.counterexample)
                ? failure.counterexample
                : [failure.counterexample];

              yield "\n";
              for (const counterexample of counterexamples) {
                yield `Counterexample${chalk.grey(`: ${JSON.stringify(counterexample, null, 2)}\n`)}`;
              }
            }
          }
        }
        break;
      }
    }
  }
}
