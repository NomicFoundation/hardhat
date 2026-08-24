/**
 * Helpers for JS-level profiling via the `--cpu-prof` sampling-profiler
 * flags, which node and bun both implement.
 */

/** Converts a sampling rate in Hz to the profiler's interval in microseconds. */
export function sampleRateToIntervalUs(sampleRateHz: number): number {
  return Math.max(1, Math.round(1_000_000 / sampleRateHz));
}

/** The `--cpu-prof` flag set for a given output directory and rate. */
export function cpuProfFlags(
  profileDir: string,
  sampleRateHz: number,
): string[] {
  return [
    "--cpu-prof",
    `--cpu-prof-interval=${String(sampleRateToIntervalUs(sampleRateHz))}`,
    // Double-quoted so that paths with spaces survive both NODE_OPTIONS
    // splitting and the bash command line of rewritten bun commands.
    `--cpu-prof-dir="${profileDir}"`,
  ];
}

/** Appends additions to an existing NODE_OPTIONS value. */
export function mergeNodeOptions(
  existing: string | undefined,
  additions: string,
): string {
  return existing === undefined || existing === ""
    ? additions
    : `${existing} ${additions}`;
}

/**
 * bun does not reliably pick up profiling flags from NODE_OPTIONS, but it
 * supports the same `--cpu-prof*` flags on its own command line. Rewrite a
 * command whose first word is `bun` or `bunx` to pass them explicitly
 * (`bunx <bin>` is shorthand for `bun x <bin>`). Returns undefined when the
 * command does not start with bun.
 */
export function injectBunCpuProfFlags(
  command: string,
  profileDir: string,
  sampleRateHz: number,
): string | undefined {
  const match = /^(\s*)(bunx?)(\s+)/.exec(command);
  if (match === null) {
    return undefined;
  }

  const [prefix, leading, executable] = [match[0], match[1], match[2]];
  const rest = command.slice(prefix.length);
  const flags = cpuProfFlags(profileDir, sampleRateHz).join(" ");

  return executable === "bunx"
    ? `${leading}bun ${flags} x ${rest}`
    : `${leading}bun ${flags} ${rest}`;
}
