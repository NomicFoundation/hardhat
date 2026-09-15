import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { performance } from "node:perf_hooks";
import path from "node:path";

import { logWarning } from "./log.ts";
import { MemorySampler, procSamplingAvailable } from "./mem-sampler.ts";
import { mean } from "./stats.ts";

/**
 * The measured-command runner for the benchmark drivers.
 *
 * Each measured execution spawns bash once and captures, in a single pass:
 * - wall-clock time (`performance.now()` around the child, minus the
 *   caller-measured calibration offset — see {@link measureShellSpawnOverhead}),
 * - CPU time via bash's `time` builtin — it reports the child rusage from
 *   wait(), which Node does not expose,
 * - the peak RSS of the tree's largest single process via
 *   {@link MemorySampler}.
 */

// Chatty commands (a full hardhat compile) can emit tens of MiB; cap the
// retained output so the driver's memory stays bounded.
const MAX_CAPTURED_OUTPUT_MIB = 64;
const MAX_CAPTURED_OUTPUT = MAX_CAPTURED_OUTPUT_MIB * 1024 * 1024;

const CALIBRATION_RUNS = 20;

const STREAM_DRAIN_GRACE_MS = 5_000;

export interface RunOptions {
  cwd: string;
  env?: Record<string, string>;
  /** Print the command's stdout/stderr instead of capturing it. */
  showOutput?: boolean;
  /** Treat a non-zero exit code as success. */
  ignoreFailure?: boolean;
}

export interface MeasuredRun {
  /** Calibrated wall-clock seconds (shell-spawn overhead subtracted). */
  wallSeconds: number;
  /** CPU seconds spent in user mode, whole process tree. */
  user: number;
  /** CPU seconds spent in kernel mode, whole process tree. */
  system: number;
  /**
   * Peak RSS of the largest single process in MB; undefined when /proc is
   * unavailable or no process was sampled.
   */
  peakRssMb: number | undefined;
}

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
 * `calibrationSeconds` is the caller-measured shell-spawn overhead to
 * subtract — see {@link measureShellSpawnOverhead}. `timingPath` is where
 * bash's `time` builtin writes its report; callers pass a path in their temp
 * dir so a crashed run leaves diagnosable state behind.
 */
export async function runMeasured(
  command: string,
  timingPath: string,
  calibrationSeconds: number,
  options: RunOptions,
): Promise<MeasuredRun> {
  // A wrapper that dies before its redirect must not leave a previous run's
  // report to be read as this run's.
  rmSync(timingPath, { force: true });

  const sampler = procSamplingAvailable() ? new MemorySampler() : undefined;

  try {
    const { wallSeconds } = await execute(
      wrapWithCpuTiming(command, timingPath),
      options,
      sampler,
    );

    const cpu = parseCpuTiming(readFileSync(timingPath, "utf-8"), timingPath);

    return {
      wallSeconds: Math.max(0, wallSeconds - calibrationSeconds),
      user: cpu.user,
      system: cpu.system,
      peakRssMb: sampler?.stop(),
    };
  } catch (error) {
    // A failed run must still clear the sampler's interval.
    sampler?.stop();
    throw error;
  }
}

export interface SeriesOptions extends RunOptions {
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
  timingPath: string,
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
  const calibration = await measureShellSpawnOverhead();

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

    const result = await runMeasured(
      command,
      timingPath,
      calibration,
      runOptions,
    );
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
 * subshell's redirected stderr. LC_ALL pins bash's locale-dependent decimal
 * separator; LC_NUMERIC would be outranked by an inherited LC_ALL.
 */
export function wrapWithCpuTiming(command: string, timingPath: string): string {
  return `{ LC_ALL=C; TIMEFORMAT='%U %S'; time { ( ${command}\n) ; } 2>&3 ; } 3>&2 2>${shellQuote(timingPath)}`;
}

/** Parse the "<user> <system>" report written by {@link wrapWithCpuTiming}. */
export function parseCpuTiming(
  raw: string,
  source: string,
): { user: number; system: number } {
  const fields = raw.trim().split(/\s+/);
  const [user, system] = fields.map(Number);

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

export function shellQuote(value: string): string {
  if (/^[\w@./:=-]+$/.test(value)) {
    return value;
  }

  return `'${value.replace(/'/g, `'\\''`)}'`;
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
 * Mean wall-clock cost of everything a measured run pays besides the command
 * itself: Node's spawn, bash startup and the `time` wrapper. Times the
 * wrapped no-op command `:` {@link CALIBRATION_RUNS} times, costing ~100 ms.
 * Hyperfine applies the same shell-spawn calibration. Callers measure once
 * per benchmark and pass the offset to every {@link runMeasured}.
 */
export async function measureShellSpawnOverhead(): Promise<number> {
  const dir = mkdtempSync(path.join(tmpdir(), "bench-calibration-"));
  const timingPath = path.join(dir, "noop-cpu.txt");

  try {
    const walls: number[] = [];

    for (let i = 0; i < CALIBRATION_RUNS; i++) {
      const { wallSeconds } = await execute(
        wrapWithCpuTiming(":", timingPath),
        { cwd: dir },
      );
      walls.push(wallSeconds);
    }

    return mean(walls);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// Resolves once the child exited and its output streams closed; the wall
// timestamp is taken at process exit, before the pipes drain.
async function execute(
  command: string,
  options: RunOptions,
  sampler?: MemorySampler,
): Promise<{ wallSeconds: number }> {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const child = spawn("bash", ["-c", command], {
      cwd: options.cwd,
      stdio: [
        "ignore",
        options.showOutput === true ? "inherit" : "pipe",
        options.showOutput === true ? "inherit" : "pipe",
      ],
      env: { ...process.env, ...options.env },
    });

    let wallSeconds = 0;
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

    if (sampler !== undefined && child.pid !== undefined) {
      sampler.start(child.pid);
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
      setTimeout(() => {
        child.stdout?.destroy();
        child.stderr?.destroy();
      }, STREAM_DRAIN_GRACE_MS).unref();
    });

    child.on("close", (code, signal) => {
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
