import { after, afterEach, before, beforeEach } from "node:test";

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

export interface CapturedConsole {
  /** The lines printed via `console.log` since the current test started. */
  readonly lines: string[];
}

/**
 * Captures `console.log` output so tests can assert on it, resetting before
 * each test.
 *
 * Like {@link disableConsole}, this overwrites `console.log`, but instead of
 * discarding the output it records each call's arguments (joined by spaces).
 * Call it once at the top of a `describe` body and read the returned handle's
 * `lines` inside each test.
 */
export function captureConsole(): CapturedConsole {
  const capture: { lines: string[] } = { lines: [] };
  const originalLog = console.log;

  beforeEach(() => {
    capture.lines = [];
    console.log = (...args: unknown[]) => {
      capture.lines.push(args.join(" "));
    };
  });

  afterEach(() => {
    console.log = originalLog;
  });

  return capture;
}
