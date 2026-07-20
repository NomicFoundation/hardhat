import { existsSync, readFileSync } from "node:fs";

// GNU time (the `time` apt package). We use it to capture peak RSS cheaply:
// it reports the maximum resident set size used by the wrapped command (in KB).
// Negligible runtime overhead (one fork+exec), unlike a sampling memory profiler.
const GNU_TIME = "/usr/bin/time";

let cachedAvailable: boolean | undefined;

// Whether GNU time is installed. Memory measurement is best-effort: when it is
// absent (e.g. a dev machine without the `time` package) callers fall back to
// running unwrapped and reporting no memory, rather than failing the benchmark.
export function gnuTimeAvailable(): boolean {
  if (cachedAvailable === undefined) {
    cachedAvailable = existsSync(GNU_TIME);
  }

  return cachedAvailable;
}

/**
 * Wrap a shell command so GNU time writes its peak RSS (in KB) to `memFile`.
 * Returns the command unchanged when GNU time is unavailable.
 *
 * Set `wrapInShell` when `command` contains shell operators (`&&`, `>>`, `|`):
 * it is then run under `sh -c` so the measurement covers the whole command, not
 * just its first program. A lone program (e.g. a `hyperfine …` invocation)
 * needs no inner shell.
 */
export function wrapWithTime(
  command: string,
  memFile: string,
  wrapInShell: boolean,
): string {
  if (!gnuTimeAvailable()) {
    return command;
  }

  return formatTimeCommand(command, memFile, wrapInShell);
}

// The pure wrapping (no availability check), split out for testing.
export function formatTimeCommand(
  command: string,
  memFile: string,
  wrapInShell: boolean,
): string {
  const inner = wrapInShell ? `sh -c ${shellQuote(command)}` : command;

  return `${GNU_TIME} -o ${shellQuote(memFile)} -f %M ${inner}`;
}

/**
 * Read the peak RSS (rounded to MB) that {@link wrapWithTime} wrote to
 * `memFile` via GNU time's `%M` value (in KB). GNU time may append a "Command
 * exited with non-zero status" line, so we take the first integer.
 *
 * Throws when the file is missing or holds no parseable number. Only call
 * this for a file GNU time was actually asked to write: guard with
 * {@link gnuTimeAvailable} first, since an unavailable GNU time runs the command
 * unwrapped and writes nothing.
 */
export function readPeakRssMb(memFile: string): number {
  if (!existsSync(memFile)) {
    throw new Error(`Peak RSS memory file not found: ${memFile}`);
  }

  const match = readFileSync(memFile, "utf-8").match(/\d+/);

  if (match === null) {
    throw new Error(`No peak RSS value found in memory file: ${memFile}`);
  }

  return Math.round(parseInt(match[0], 10) / 1024);
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
