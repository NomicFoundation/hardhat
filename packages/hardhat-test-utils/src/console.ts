import { after, before } from "node:test";

/**
 * Disables the console functions that directly interact with stdout/stderr.
 *
 * This function is useful when you want to test a function that use console
 * logging but you don't want to see the output in the test report.
 * In particular, we have observed that using console.log can cause errors like:
 *  - Error: Unable to deserialize cloned data due to invalid or unsupported version.
 *
 * This function overwrites the original console.log/console.warn/console.dir
 * with no-op functions.
 *
 * If we ever want to inspect the stdout/stderr, we could accept
 * NodeJS.WritableStream arguments and write formatted messages to them instead.
 *
 * Another interesting extension to this function would be not to disable the
 * console streams if a DEBUG flag is set in the environment.
 */
export function disableConsole(): void {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalDir = console.dir;

  before(() => {
    console.log = () => {};
    console.warn = () => {};
    console.dir = () => {};
  });

  after(() => {
    console.log = originalLog;
    console.warn = originalWarn;
    console.dir = originalDir;
  });
}
