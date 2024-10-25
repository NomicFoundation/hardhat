import type { Failure } from "./formatting.js";
import type {
  TestEventData,
  TestEventSource,
  TestReporter,
  TestReporterResult,
  TestRunOptions,
} from "./types.js";

import chalk from "chalk";

import { processGlobalDiagnostics } from "./diagnostics.js";
import {
  formatFailureReason,
  formatGlobalDiagnostics,
  formatUnusedDiagnostics,
  formatTestCancelledByParentFailure,
  formatTestContext,
  formatTestFailure,
  formatTestPass,
  formatSlowTestInfo,
} from "./formatting.js";
import { annotatePR } from "./github-actions.js";
import {
  isCancelledByParentError,
  isSubtestFailedError,
} from "./node-test-error-utils.js";
import {
  getTestRunOptions,
  isTopLevelFilePassEvent,
} from "./node-test-utils.js";

export const SLOW_TEST_THRESHOLD = 75;

export interface HardhatTestReporterConfig {
  testOnlyMessage?: string;
}

/**
 * This is a node:test reporter that tries to mimic Mocha's default reporter, as
 * close as possible.
 *
 * It is designed to output information about the test runs as soon as possible
 * and in test defintion order.
 *
 * Once the test run ends, it will output global information about it, based on
 * the diagnostics emitted by node:test, and any custom or unrecognized
 * diagnostics message.
 *
 * Finally, it will output the failure reasons for all the failed tests.
 *
 * @param source
 */

const customReporter: TestReporter = hardhatTestReporter(getTestRunOptions());
export default customReporter;

export function hardhatTestReporter(
  options: TestRunOptions,
  config: HardhatTestReporterConfig = {},
): TestReporter {
  return async function* (source: TestEventSource): TestReporterResult {
    /**
     * The test reporter works by keeping a stack of the currently executing[1]
     * tests and suites. We use it to keep track of the context of a test, so that
     * when it passes or fails, we can print that context (if necessary), before
     * its results.
     *
     * Printing the context of a test will normally imply printing all the
     * describes where it is nested.
     *
     * As the context may be shared by more than one test, and we don't want to
     * repeate it, we keep track of the last printed context element. We do this
     * by keeping track of its index in the stack.
     *
     * We also keep track of any diagnostic message that is reported by node:test
     * and at the end we try to parse the global diagnostics to gather information
     * about the test run. If during this parsing we don't recognize or can't
     * properly parse one of this diagnostics, we will print it at the end.
     *
     * Whenever a test fails, we pre-format its failure reason, so that we don't
     * need to keep the failure event in memory, and we can still print the
     * failure reason at the end.
     *
     * This code is structed in the following way:
     *  - We use an async generator to process the events as they come, printing
     *  the information as soon as possible.
     *  - Instead of printing, we yield string.
     *  - Any formatting that needs to be done is done in the formatting module.
     *  - The formatting module exports functions that generate strings for the
     *  different parts of the test run's output. They do not print anything, and
     *  they never end in a newline. Any newline between different parts of the
     *  output is added by the generator.
     *  - The generaor drives the high-level format of the output, and only uses
     *  the formatting functions to generate repetitive parts of it.
     *
     * [1] As reported by node:test, in defintion order, which may differ from
     * actual execution order.
     */

    const stack: Array<TestEventData["test:start"]> = [];

    let lastPrintedIndex: number | undefined;

    const diagnostics: Array<TestEventData["test:diagnostic"]> = [];

    const preFormattedFailureReasons: string[] = [];

    let topLevelFilePassCount = 0;

    for await (const event of source) {
      switch (event.type) {
        case "test:diagnostic": {
          diagnostics.push(event.data);
          break;
        }
        case "test:start": {
          stack.push(event.data);
          break;
        }
        case "test:pass":
        case "test:fail": {
          // We do not want to display top-level file passes, as they are not
          // interesting. We only want to display top-level file failures.
          if (isTopLevelFilePassEvent(event)) {
            topLevelFilePassCount++;
            stack.pop();
            break;
          }

          if (event.data.details.type === "suite") {
            // If a suite failed for a reason other than a subtest failing, we
            // want to print its failure.
            if (event.type === "test:fail") {
              if (!isSubtestFailedError(event.data.details.error)) {
                const failure: Failure = {
                  index: preFormattedFailureReasons.length,
                  testFail: event.data,
                  contextStack: stack,
                };

                // We format the failure reason and store it in an array, so that we
                // can output it at the end.
                preFormattedFailureReasons.push(formatFailureReason(failure));

                await annotatePR(event.data);

                yield `\n${formatTestFailure(failure)}\n`;
              }
            }

            // If a suite/describe was already printed, we need to descrease
            // the lastPrintedIndex, as we are removing it from the stack.
            //
            // If its nesting was 0, we print an empty line to separate top-level
            // describes.
            if (event.data.nesting === 0) {
              lastPrintedIndex = undefined;
              yield "\n";
            } else {
              if (lastPrintedIndex !== undefined) {
                lastPrintedIndex = lastPrintedIndex - 1;

                if (lastPrintedIndex < 0) {
                  lastPrintedIndex = undefined;
                }
              }
            }

            // Remove the current test from the stack, as it was just processed
            stack.pop();
            continue;
          }

          // If we have printed everything except the current element in the stack
          // all of it's context/hierarchy has been printed (e.g. its describes).
          //
          // Otherwise, we print all the unprinted elements in the stack, except
          // for the last one, which is the current test.
          if (lastPrintedIndex !== stack.length - 2) {
            yield formatTestContext(
              stack.slice(
                lastPrintedIndex !== undefined ? lastPrintedIndex + 1 : 0,
                -1,
              ),
            );
            yield "\n";
            lastPrintedIndex = stack.length - 2;
          }

          if (event.type === "test:pass") {
            yield formatTestPass(event.data);
          } else {
            if (isCancelledByParentError(event.data.details.error)) {
              // We don't want to display cancelled by parent error details, as
              // the actionable information will be printed with the parent error
              const failure: Failure = {
                // We use the index of the pre-formatted failure reasons, as the
                // cancelled by parent error should be the next one on the stack
                index: preFormattedFailureReasons.length,
                testFail: event.data,
                contextStack: stack,
              };

              yield formatTestCancelledByParentFailure(failure);
            } else {
              const failure: Failure = {
                index: preFormattedFailureReasons.length,
                testFail: event.data,
                contextStack: stack,
              };

              // We format the failure reason and store it in an array, so that we
              // can output it at the end.
              preFormattedFailureReasons.push(formatFailureReason(failure));

              await annotatePR(event.data);

              yield formatTestFailure(failure);
            }
          }

          // If the test was slow, we print a message about it
          if (event.data.details.duration_ms > SLOW_TEST_THRESHOLD) {
            yield formatSlowTestInfo(event.data.details.duration_ms);
          }

          yield "\n";

          // Top-level tests are separated by an empty line
          if (event.data.nesting === 0) {
            yield "\n";
          }

          // Remove the current test from the stack, as it was just processed it
          stack.pop();
          break;
        }
        case "test:stderr": {
          yield event.data.message;
          break;
        }
        case "test:stdout": {
          yield event.data.message;
          break;
        }
        case "test:coverage": {
          yield chalk.red("\nTest coverage not supported by this reporter\n");
          break;
        }
        default: {
          // NOTE: Do nothing; we explicitly opt-in to the events we want to
          // handle because future versions of node might and will emit new
          // events that we don't yet know about and we don't want to break
          // when that happens.
          break;
        }
      }
    }

    const { globalDiagnostics, unusedDiagnostics } =
      processGlobalDiagnostics(diagnostics);

    // We need to subtract the number of tests/suites that we chose not to
    // display from the summary
    globalDiagnostics.tests -= topLevelFilePassCount;
    globalDiagnostics.pass -= topLevelFilePassCount;

    yield "\n";
    yield formatGlobalDiagnostics(globalDiagnostics);

    if (unusedDiagnostics.length > 0) {
      yield "\n";
      yield formatUnusedDiagnostics(unusedDiagnostics, config.testOnlyMessage);
    }

    yield "\n\n";

    for (const reason of preFormattedFailureReasons) {
      yield reason;
      yield "\n\n";
    }
  };
}
