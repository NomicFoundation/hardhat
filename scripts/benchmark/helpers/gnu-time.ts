import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

// GNU time (the `time` apt package). One wrapper captures both CPU time
// (user + system seconds) and peak RSS (the maximum resident set size any
// process in the command's subtree reached, in KB) with negligible runtime
// overhead (one fork+exec), unlike a sampling profiler.
const GNU_TIME = "/usr/bin/time";

let cachedAvailable: boolean | undefined;

// Whether GNU time is installed. It is required for benchmarking (CI
// preinstalls the `time` package); callers should fail fast when it is
// missing rather than fall back to unmeasured runs. Existence alone isn't
// enough: on macOS /usr/bin/time is BSD time, which rejects the -o/-f flags
// used by wrapWithTime, so verify via --version (BSD time has no --version).
export function gnuTimeAvailable(): boolean {
  if (cachedAvailable === undefined) {
    if (existsSync(GNU_TIME)) {
      const result = spawnSync(GNU_TIME, ["--version"], { encoding: "utf-8" });
      // 1.9 prints "time (GNU Time)", 1.7 prints "GNU time 1.7"
      cachedAvailable =
        result.status === 0 &&
        /GNU time/i.test(`${result.stdout}${result.stderr}`);
    } else {
      cachedAvailable = false;
    }
  }

  return cachedAvailable;
}

export interface TimeOutput {
  user: number;
  system: number;
  peakRssMb: number;
}

/**
 * Wrap a shell command so GNU time writes "<user> <system> <peak RSS in KB>"
 * to `outFile`, read back with {@link readTimeOutput}.
 *
 * Set `wrapInShell` when `command` contains shell operators (`&&`, `>>`, `|`):
 * it is then run under `sh -c` so the measurement covers the whole command, not
 * just its first program. A lone program (e.g. a `hyperfine …` invocation)
 * needs no inner shell.
 */
export function wrapWithTime(
  command: string,
  outFile: string,
  wrapInShell: boolean,
): string {
  const inner = wrapInShell ? `sh -c ${shellQuote(command)}` : command;

  return `${GNU_TIME} -o ${shellQuote(outFile)} -f '%U %S %M' ${inner}`;
}

/**
 * Read the measurement line that {@link wrapWithTime} wrote to `outFile`:
 * user CPU seconds, system CPU seconds, and peak RSS (KB, rounded to MB).
 * GNU time may add a "Command exited with non-zero status" line, so the
 * measurement line is matched specifically rather than taken positionally.
 *
 * Throws when the file is missing or holds no parseable measurement line.
 */
export function readTimeOutput(outFile: string): TimeOutput {
  if (!existsSync(outFile)) {
    throw new Error(`GNU time output file not found: ${outFile}`);
  }

  const raw = readFileSync(outFile, "utf-8");
  const match = raw.match(/^(\d+(?:\.\d+)?) (\d+(?:\.\d+)?) (\d+)$/m);

  if (match === null) {
    throw new Error(
      `No GNU time measurement found in ${outFile}: ${JSON.stringify(raw)}`,
    );
  }

  return {
    user: Number(match[1]),
    system: Number(match[2]),
    peakRssMb: Math.round(Number(match[3]) / 1024),
  };
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
