import type {
  TestEventSource,
  TestReporterResult,
  TestStatus,
} from "./types.js";

import chalk from "chalk";

/**
 * This is a solidity test reporter. It is intended to be composed with the
 * solidity test runner's test stream. It was based on the hardhat node test
 * reporter's design.
 */
export async function* testReporter(
  source: TestEventSource,
): TestReporterResult {
  let testResultCount = 0;
  let successCount = 0;
  let failureCount = 0;
  let skippedCount = 0;

  for await (const event of source) {
    switch (event.type) {
      case "suite:result": {
        const { data: suiteResult } = event;
        for (const testResult of suiteResult.testResults) {
          testResultCount++;
          let name = suiteResult.id.name + " | " + testResult.name;
          if ("runs" in testResult?.kind) {
            name += ` (${testResult.kind.runs} runs)`;
          }
          const status: TestStatus = testResult.status;
          switch (status) {
            case "Success": {
              yield chalk.green(`✔ ${name}`);
              successCount++;
              break;
            }
            case "Failure": {
              yield chalk.red(`✖ ${name}`);
              failureCount++;
              break;
            }
            case "Skipped": {
              yield chalk.yellow(`⚠️ ${name}`);
              skippedCount++;
              break;
            }
          }
          yield "\n";
        }
        break;
      }
    }
  }

  yield "\n";
  yield `${testResultCount} tests found, ${successCount} passed, ${failureCount} failed, ${skippedCount} skipped`;
  yield "\n";
}
