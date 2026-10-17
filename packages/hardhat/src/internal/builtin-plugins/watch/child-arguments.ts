/**
 * The command line flags that only the watching process uses. They are removed
 * from the arguments of every command it starts, so that the command runs once.
 */
const WATCH_FLAGS = new Set(["--watch", "-w", "--no-restart", "--run-all"]);

/**
 * The command line options that only the watching process uses, and that take
 * a value.
 */
const WATCH_OPTIONS = new Set(["--watch-delay"]);

/**
 * Returns whether the raw command line arguments enable watch mode.
 *
 * @param rawArguments The command line arguments, without the node executable
 * and the script path.
 */
export function hasWatchFlag(rawArguments: string[]): boolean {
  return rawArguments.some((arg) => arg === "--watch" || arg === "-w");
}

/**
 * Returns the raw command line arguments without the watch mode flags and
 * options, so that they run the task once.
 *
 * Hardhat flags never take a value and short flags can't be grouped (except
 * for levels like `-vvv`), so the watch arguments can be removed token by
 * token.
 *
 * @param rawArguments The command line arguments, without the node executable
 * and the script path.
 */
export function removeWatchArguments(rawArguments: string[]): string[] {
  const result: string[] = [];

  for (let i = 0; i < rawArguments.length; i++) {
    const arg = rawArguments[i];

    if (WATCH_FLAGS.has(arg)) {
      continue;
    }

    if (WATCH_OPTIONS.has(arg)) {
      // Skip the option's value too
      i++;
      continue;
    }

    const equalsIndex = arg.indexOf("=");
    if (
      arg.startsWith("--") &&
      equalsIndex !== -1 &&
      WATCH_OPTIONS.has(arg.substring(0, equalsIndex))
    ) {
      continue;
    }

    result.push(arg);
  }

  return result;
}
