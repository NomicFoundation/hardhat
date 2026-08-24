import { shellQuote } from "./shell.ts";

/**
 * The `perf record` argument list for CPU-sampling a whole process tree.
 *
 * The software `cpu-clock` event is used instead of hardware `cycles` because
 * it works everywhere `perf_event_open` does — virtualized environments such
 * as WSL2 expose no PMU, where `cycles` cannot be opened. For CPU-time
 * attribution the two are equivalent at the same sampling rate.
 */
export function perfRecordArgs(
  perfDataPath: string,
  sampleRateHz: number,
): string[] {
  return [
    "record",
    "-e",
    "cpu-clock",
    "-F",
    String(sampleRateHz),
    "-g",
    "-o",
    perfDataPath,
  ];
}

/**
 * Wraps a shell command in a CPU-sampling `perf record` of its whole process
 * tree.
 */
export function wrapWithPerfCpu(
  command: string,
  perfDataPath: string,
  sampleRateHz: number,
): string {
  return [
    "perf",
    ...perfRecordArgs(perfDataPath, sampleRateHz).map(shellQuote),
    "--",
    "bash -c",
    shellQuote(command),
  ].join(" ");
}

/**
 * NODE_OPTIONS additions that make JavaScript frames visible to perf: V8
 * writes /tmp/perf-<pid>.map files mapping JIT code addresses to function
 * names, and interpreted frames are materialized on the native stack.
 */
export const PERF_JS_NODE_OPTIONS =
  "--perf-basic-prof --interpreted-frames-native-stack";
