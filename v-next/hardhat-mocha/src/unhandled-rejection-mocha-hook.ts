import chalk from "chalk";

// This file is loaded directly by our mocha runner task, as well as by mocha when ran in parallel mode, via the `require` arg.
// The purpose of this patch is to detect unhandled rejected promises that are caused by not awaiting async expectations

let showNotAwaitedError = false;

process.on("unhandledRejection", (e: Error) => {
  if (e.name === "AssertionError") {
    // Mark the error and show it at the end, before process exits
    // This can show many times when on parallel mode, since mocha spawns multiple processes
    showNotAwaitedError = true;
  }
});

process.on("exit", () => {
  if (showNotAwaitedError) {
    console.log(
      chalk.red(
        [
          'Error: Missing "await" on async assert/expect.',
          "",
          'You called "expect(...)" or an assertion function on a value that returns a Promise, but did not "await" it or return it from the test.',
          "",
          "This means the assertion ran asynchronously and Mocha may finish the test before the assertion actually fails.",
        ].join("\n"),
      ),
    );
  }
});

// Only used in parallel mode. Mocha will load and execute this hook
// This grace period is required otherwise mocha just kills the child processes before they get notice of the unhandled rejections
// The value is what we think is appropriate to wait for e.g. an EDR reverted transaction.
// It could be a border case where this value is too low, but we prefer to eventually lose a warning than to significantly slow down all test suites
const GRACE_TIME_MS = 10;

export const mochaHooks = {
  async afterAll(): Promise<void> {
    await new Promise((r) => setTimeout(r, GRACE_TIME_MS));
  },
};
