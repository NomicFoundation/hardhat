import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { performance } from "node:perf_hooks";
import path from "node:path";

import { logWarning } from "./log.ts";
import {
  createPeakRssRecorder,
  type PeakRssMethod,
  type PeakRssRecorder,
} from "./peak-rss.ts";
import { BASH, shellQuote } from "./shell.ts";
import { mean } from "./stats.ts";

/**
 * The measured-command runner for the benchmark drivers.
 *
 * Each measured execution spawns bash once and captures, in a single pass:
 * - wall-clock time (`performance.now()` around the child),
 * - CPU time via bash's `time` builtin — it reports the child rusage from
 *   wait(), which Node does not expose,
 * - the peak RSS of the tree's largest single process, through the
 *   caller-selected {@link PeakRssMethod}.
 *
 * Wall-clock and CPU times are reported net of the caller-measured spawn
 * overhead — see {@link measureShellSpawnOverhead}.
 */

// Chatty commands (a full hardhat compile) can emit tens of MiB; cap the
// retained output so the driver's memory stays bounded.
const MAX_CAPTURED_OUTPUT_MIB = 64;
const MAX_CAPTURED_OUTPUT = MAX_CAPTURED_OUTPUT_MIB * 1024 * 1024;

const CALIBRATION_RUNS = 20;

const STREAM_DRAIN_GRACE_MS = 5_000;

/**
 * Where a measured run's wrappers write their reports. Callers pass paths in
 * their own temp dir, so a crashed run leaves diagnosable state behind.
 */
export interface ReportPaths {
  /** bash's `time` builtin report, "<user> <system>" in seconds. */
  cpuTimingPath: string;
  /** GNU time's peak-RSS report, %M in kB; unused by the sampler. */
  peakRssPath: string;
}

/**
 * One benchmark's report files: `<stem>-cpu.txt` and `<stem>-mem.txt` in
 * `dir`.
 */
export function reportPathsIn(dir: string, stem: string): ReportPaths {
  return {
    cpuTimingPath: path.join(dir, `${stem}-cpu.txt`),
    peakRssPath: path.join(dir, `${stem}-mem.txt`),
  };
}

export interface RunOptions {
  cwd: string;
  env?: Record<string, string>;
  /** Print the command's stdout/stderr instead of capturing it. */
  showOutput?: boolean;
  /** Treat a non-zero exit code as success. */
  ignoreFailure?: boolean;
}

export interface MeasuredOptions extends RunOptions {
  /**
   * The peak-RSS method to measure with, already resolved by
   * `resolvePeakRssMethod`; undefined leaves memory unmeasured.
   */
  peakRssMethod: PeakRssMethod | undefined;
}

export interface MeasuredRun {
  /** Calibrated wall-clock seconds (shell-spawn overhead subtracted). */
  wallSeconds: number;
  /**
   * Calibrated CPU seconds spent in user mode, whole process tree
   * (shell-spawn overhead subtracted).
   */
  user: number;
  /** Calibrated CPU seconds spent in kernel mode, whole process tree. */
  system: number;
  /**
   * Peak RSS of the largest single process in MB; undefined when no
   * peak-RSS method was in use or no process was sampled.
   */
  peakRssMb: number | undefined;
}

/**
 * What a measured run costs besides the command itself, in seconds. Each
 * field is subtracted from its counterpart in {@link MeasuredRun} — see
 * {@link measureShellSpawnOverhead}.
 */
export interface SpawnOverhead {
  wallSeconds: number;
  user: number;
  system: number;
}

/** The overhead of a run that was not calibrated. */
export const NO_SPAWN_OVERHEAD: SpawnOverhead = {
  wallSeconds: 0,
  user: 0,
  system: 0,
};

/**
 * Run a command without measuring it (prerequisite steps, prepare hooks).
 */
export async function runPlain(
  command: string,
  options: RunOptions,
): Promise<void> {
  await execute(command, options);
}

/**
 * Run a command once and measure wall-clock, CPU and peak RSS.
 *
 * `overhead` is the caller-measured shell-spawn overhead to subtract — see
 * {@link measureShellSpawnOverhead}, which must be calibrated with the same
 * `peakRssMethod` as this run.
 */
export async function runMeasured(
  command: string,
  reports: ReportPaths,
  overhead: SpawnOverhead,
  options: MeasuredOptions,
): Promise<MeasuredRun> {
  // A wrapper that dies before its redirect must not leave a previous run's
  // reports to be read as this run's.
  for (const report of Object.values(reports)) {
    rmSync(report, { force: true });
  }

  const recorder = createPeakRssRecorder(
    options.peakRssMethod,
    reports.peakRssPath,
  );

  try {
    const { wallSeconds } = await execute(
      wrapForMeasurement(command, reports, recorder),
      options,
      recorder,
    );

    const cpu = readCpuTiming(reports.cpuTimingPath);

    return {
      wallSeconds: netOfOverhead(wallSeconds, overhead.wallSeconds),
      user: netOfOverhead(cpu.user, overhead.user),
      system: netOfOverhead(cpu.system, overhead.system),
      peakRssMb: recorder.finish(),
    };
  } catch (error) {
    recorder.cancel();
    throw error;
  }
}

function wrapForMeasurement(
  command: string,
  reports: ReportPaths,
  recorder: PeakRssRecorder,
): string {
  return wrapWithCpuTiming(
    recorder.wrapCommand(command),
    reports.cpuTimingPath,
  );
}

export interface SeriesOptions extends MeasuredOptions {
  /** Number of measured runs. */
  runs: number;
  /** Unmeasured warm-up runs before the measured ones (default 0). */
  warmup?: number;
  /** Command to run, unmeasured, before each run (including warm-ups). */
  prepare?: string;
  /** Called after each completed warm-up run. */
  onWarmupCompleted?: (index: number, total: number) => void;
  /** Called after each completed measured run. */
  onRunCompleted?: (run: MeasuredRun, index: number, total: number) => void;
}

/**
 * Run a command `runs` times and measure each run. Warm-up runs execute
 * unmeasured first. `prepare` runs unmeasured before every run, including
 * before warm-up runs. `ignoreFailure` applies to the benchmarked command
 * only, never to prepare. The shell-spawn calibration is measured once for
 * the whole series.
 */
export async function runSeries(
  command: string,
  reports: ReportPaths,
  options: SeriesOptions,
): Promise<MeasuredRun[]> {
  const {
    runs,
    warmup = 0,
    prepare,
    onWarmupCompleted,
    onRunCompleted,
    ...runOptions
  } = options;
  const prepareOptions = { ...runOptions, ignoreFailure: false };
  const overhead = await measureShellSpawnOverhead(runOptions.peakRssMethod);

  for (let i = 0; i < warmup; i++) {
    if (prepare !== undefined) {
      await runPrepare(prepare, prepareOptions);
    }

    await runPlain(command, runOptions);
    onWarmupCompleted?.(i, warmup);
  }

  const results: MeasuredRun[] = [];

  for (let i = 0; i < runs; i++) {
    if (prepare !== undefined) {
      await runPrepare(prepare, prepareOptions);
    }

    const result = await runMeasured(command, reports, overhead, runOptions);
    results.push(result);
    onRunCompleted?.(result, i, runs);
  }

  return results;
}

/**
 * Run a prepare hook, unmeasured. Its failures name the hook: the enclosing
 * error context otherwise attributes them to the benchmarked command.
 */
export async function runPrepare(
  command: string,
  options: RunOptions,
): Promise<void> {
  try {
    await runPlain(command, options);
  } catch (error) {
    throw error instanceof CommandFailedError
      ? new CommandFailedError(
          `Prepare command failed: ${error.message}`,
          error.stdout,
          error.stderr,
          command,
        )
      : error;
  }
}

/**
 * Wrap a shell command so bash's `time` builtin writes the tree's CPU usage
 * ("<user> <system>", in seconds) to `timingPath`. The command's own stderr
 * detours through fd 3 back to the real stderr (so failures surface whole);
 * only `time`'s report reaches `timingPath`. The command runs in a subshell:
 * a top-level `exit` must not skip the report. The timed pipeline must stay
 * a brace group — timing the subshell directly reroutes the report to the
 * subshell's redirected stderr. The command's locale is left untouched, so
 * it runs under its declared env; {@link parseCpuTiming} absorbs the
 * locale-dependent decimal separator instead.
 */
export function wrapWithCpuTiming(command: string, timingPath: string): string {
  return `{ TIMEFORMAT='%U %S'; time { ( ${command}\n) ; } 2>&3 ; } 3>&2 2>${shellQuote(timingPath)}`;
}

// Clamped at 0: a command can cost less than the calibration's spread.
function netOfOverhead(measured: number, overhead: number): number {
  return Math.max(0, measured - overhead);
}

/** Read the CPU report a wrapped run wrote to `timingPath`. */
function readCpuTiming(timingPath: string): { user: number; system: number } {
  return parseCpuTiming(readFileSync(timingPath, "utf-8"), timingPath);
}

/** Parse the "<user> <system>" report written by {@link wrapWithCpuTiming}. */
export function parseCpuTiming(
  raw: string,
  source: string,
): { user: number; system: number } {
  const fields = raw.trim().split(/\s+/);
  // bash prints the report with the inherited locale's decimal separator.
  const [user, system] = fields.map((field) => Number(field.replace(",", ".")));

  if (
    fields.length !== 2 ||
    !Number.isFinite(user) ||
    !Number.isFinite(system)
  ) {
    throw new Error(
      `Unparseable bash time output at ${source}: ${JSON.stringify(raw)}`,
    );
  }

  return { user, system };
}

/**
 * Render captured output streams for an error message. Failures are rare and
 * abort the benchmark, so the whole output is shown rather than a tail — a
 * compiler error can sit thousands of warning lines above the end.
 */
export function formatOutput(streams: {
  stdout?: string;
  stderr?: string;
}): string {
  return Object.entries(streams)
    .map(([name, text]) => [name, (text ?? "").trimEnd()] as const)
    .filter(([, text]) => text !== "")
    .map(([name, text]) => `  --- ${name} ---\n${text}`)
    .join("\n");
}

/** A command failure, carrying the captured stdout/stderr. */
export class CommandFailedError extends Error {
  public readonly stdout: string;
  public readonly stderr: string;
  /** The failing command, when it is not the benchmarked one (prepare). */
  public readonly command?: string;

  constructor(
    message: string,
    stdout: string,
    stderr: string,
    command?: string,
  ) {
    super(message);
    this.stdout = stdout;
    this.stderr = stderr;
    this.command = command;
  }
}

/**
 * What a measured run pays besides the command itself. Wall time covers
 * everything from Node's spawn to the child's exit: bash startup, the
 * measurement wrappers, and time spent blocked. CPU time covers only what
 * runs inside the bash `time` group, which is the subshell and the peak-RSS
 * wrapper, because the keyword cannot see the bash that runs it. Each figure
 * is the mean over the wrapped no-op `:` run {@link CALIBRATION_RUNS} times,
 * costing ~100 ms, and each is subtracted from the reading taken the same
 * way, so the two need not agree. Hyperfine applies the same shell-spawn
 * calibration. Callers measure once per benchmark and pass the overhead to
 * every {@link runMeasured}.
 *
 * `peakRssMethod` must be the one the measured runs use, or the overhead
 * misses the processes that method adds.
 */
export async function measureShellSpawnOverhead(
  peakRssMethod: PeakRssMethod | undefined,
): Promise<SpawnOverhead> {
  const dir = mkdtempSync(path.join(tmpdir(), "bench-calibration-"));
  const reports = reportPathsIn(dir, "noop");

  try {
    const walls: number[] = [];
    const users: number[] = [];
    const systems: number[] = [];

    for (let i = 0; i < CALIBRATION_RUNS; i++) {
      const recorder = createPeakRssRecorder(
        peakRssMethod,
        reports.peakRssPath,
      );

      try {
        const { wallSeconds } = await execute(
          wrapForMeasurement(":", reports, recorder),
          { cwd: dir },
          recorder,
        );
        const cpu = readCpuTiming(reports.cpuTimingPath);

        walls.push(wallSeconds);
        users.push(cpu.user);
        systems.push(cpu.system);
      } finally {
        recorder.cancel();
      }
    }

    return {
      wallSeconds: mean(walls),
      user: mean(users),
      system: mean(systems),
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// Resolves once the child exited and its output streams closed; the wall
// timestamp is taken at process exit, before the pipes drain.
async function execute(
  command: string,
  options: RunOptions,
  recorder?: PeakRssRecorder,
): Promise<{ wallSeconds: number }> {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const child = spawn(BASH, ["-c", command], {
      cwd: options.cwd,
      stdio: [
        "ignore",
        options.showOutput === true ? "inherit" : "pipe",
        options.showOutput === true ? "inherit" : "pipe",
      ],
      env: { ...process.env, ...options.env },
    });

    let wallSeconds = 0;
    let drainTimer: NodeJS.Timeout | undefined;
    const stdout = new CappedBuffer();
    const stderr = new CappedBuffer();

    child.stdout?.on("data", (chunk: Buffer) => stdout.append(chunk));
    child.stderr?.on("data", (chunk: Buffer) => stderr.append(chunk));
    child.stdout?.on("error", (error: Error) =>
      logWarning(`stdout capture failed: ${error.message}`),
    );
    child.stderr?.on("error", (error: Error) =>
      logWarning(`stderr capture failed: ${error.message}`),
    );

    if (recorder !== undefined && child.pid !== undefined) {
      recorder.observe(child.pid);
    }

    child.on("error", (error) => {
      reject(
        new CommandFailedError(
          `Failed to spawn command: ${error.message}`,
          stdout.toString(),
          stderr.toString(),
        ),
      );
    });

    child.on("exit", () => {
      wallSeconds = (performance.now() - start) / 1000;

      // An orphaned grandchild can hold the stdio pipes open forever.
      // Severing them after the grace period lets "close" fire.
      drainTimer = setTimeout(() => {
        child.stdout?.destroy();
        child.stderr?.destroy();
      }, STREAM_DRAIN_GRACE_MS);
      drainTimer.unref();
    });

    child.on("close", (code, signal) => {
      // The armed timer's closure retains the child and its capped buffers;
      // drop it once the pipes have closed on their own.
      clearTimeout(drainTimer);

      const reason =
        signal !== null
          ? `was killed by signal ${signal}`
          : `exited with code ${String(code)}`;

      if (code === 0 || options.ignoreFailure === true) {
        if (code !== 0) {
          logWarning(`Command ${reason} (ignored)`);
        }

        resolve({ wallSeconds });
        return;
      }

      reject(
        new CommandFailedError(
          `Command ${reason}`,
          stdout.toString(),
          stderr.toString(),
        ),
      );
    });
  });
}

class CappedBuffer {
  private chunks: Buffer[] = [];
  private length: number = 0;
  private truncated: boolean = false;

  public append(chunk: Buffer): void {
    const room = MAX_CAPTURED_OUTPUT - this.length;

    if (chunk.length > room) {
      this.truncated = true;
    }

    if (room <= 0) {
      return;
    }

    this.chunks.push(chunk.subarray(0, room));
    this.length += Math.min(chunk.length, room);
  }

  public toString(): string {
    const text = Buffer.concat(this.chunks).toString("utf-8");

    return this.truncated
      ? `${text}\n[remaining output truncated after ${MAX_CAPTURED_OUTPUT_MIB} MiB]`
      : text;
  }
}
