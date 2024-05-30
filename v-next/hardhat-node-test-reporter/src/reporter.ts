import chalk from "chalk";

import { processGlobalDiagnostics } from "./diagnostics.js";
import {
  formatFailureReason,
  formatGlobalDiagnostics,
  formatUnusedDiagnostics,
  formatTestContext,
  formatTestFailure,
  formatTestPass,
  formatSlowTestInfo,
  Failure,
} from "./formatting.js";
import {
  TestEventData,
  TestEventSource,
  TestReporterResult,
} from "./node-types.js";

export const SLOW_TEST_THRESHOLD = 75;

export default async function* customReporter(
  source: TestEventSource,
): TestReporterResult {
  // This reporter prints the tests in definition order, imitating Mocha's
  // default reporter as close as possible.
  //
  // We use this stack to keep track of the current test hierarchy.
  //
  // The output of each test (its context - the describe they belong to -
  // and if they passed/failed) is printed as soon as the test finishes.
  const stack: Array<TestEventData["test:start"]> = [];

  // We use this number to keep track of which elements from the stack have
  // already been printed (e.g. a describe).
  let lastPrintedIndex: number | undefined;

  // Diagnostics are processed at the end, so we collect them all here
  const diagnostics: Array<TestEventData["test:diagnostic"]> = [];

  const preFormattedFailureReasons: string[] = [];

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
        if (event.data.details.type === "suite") {
          // If a suite failed for a reason other than a subtest failing, we
          // want to print its failure, so we push it to the failures array.
          if (event.type === "test:fail") {
            if (
              !(
                "code" in event.data.details.error &&
                "failureType" in event.data.details.error &&
                event.data.details.error.code === "ERR_TEST_FAILURE" &&
                event.data.details.error.failureType === "subtestsFailed"
              )
            ) {
              preFormattedFailureReasons.push(
                formatFailureReason({
                  index: preFormattedFailureReasons.length,
                  testFail: event.data,
                  contextStack: stack,
                }),
              );
            }
          }

          stack.pop();

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

          continue;
        }

        // If we have printed everything except the current element in the stack
        // all of it's context/hierarchy has been printed (e.g. the describes).\
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
          const failure: Failure = {
            index: preFormattedFailureReasons.length,
            testFail: event.data,
            contextStack: stack,
          };

          preFormattedFailureReasons.push(formatFailureReason(failure));

          yield formatTestFailure(failure);
        }

        if (event.data.details.duration_ms > SLOW_TEST_THRESHOLD) {
          yield formatSlowTestInfo(event.data.details.duration_ms);
        }

        yield "\n";

        stack.pop();

        // Top-level tests are separated by an empty line
        if (event.data.nesting === 0) {
          yield "\n";
        }

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
      case "test:plan": {
        // Do nothing
        break;
      }
      case "test:enqueue": {
        // Do nothing
        break;
      }
      case "test:dequeue": {
        // Do nothing
        break;
      }
      case "test:watch:drained": {
        // Do nothing
        break;
      }
      case "test:complete": {
        // Do nothing
        break;
      }
      case "test:coverage": {
        yield chalk.red("\nTest coverage not supported by this reporter\n");
        break;
      }
      // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
      default: {
        const _isNever: never = event;
        void _isNever;

        const type = (event as any).type;
        yield chalk.red(`Unsuported node:test event type ${type}:`, event);
        break;
      }
    }
  }

  const { globalDiagnostics, unusedDiagnostics } =
    processGlobalDiagnostics(diagnostics);

  yield "\n";
  yield formatGlobalDiagnostics(globalDiagnostics);

  if (unusedDiagnostics.length > 0) {
    yield "\n";
    yield formatUnusedDiagnostics(unusedDiagnostics);
  }

  yield "\n\n";

  for (const reason of preFormattedFailureReasons) {
    yield reason;
    yield "\n\n";
  }
}
