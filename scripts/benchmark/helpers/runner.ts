import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { performance } from "node:perf_hooks";
import path from "node:path";

import {
  MemorySampler,
  procSamplingAvailable,
  type MemorySeries,
} from "./mem-series.ts";

/**
 * The measured command runner shared by regression.ts and main.ts.
 *
 * Each measured execution spawns bash once and captures, in a single pass:
 * - wall-clock time (`performance.now()` around the child, minus the
 *   shell-spawn calibration offset — see {@link shellSpawnOverheadSeconds}),
 * - CPU time via bash's `time` builtin (a reserved word, not a process: it
 *   reads the exact child rusage the kernel reports at wait(), with zero
 *   startup overhead; Node exposes no child rusage of its own),
 * - the memory-over-time series and exact peak RSS via {@link MemorySampler}.
 */

// The default 1 MiB pipe buffer of execSync would make chatty-but-successful
// commands (e.g. a full hardhat compile) fail; we cap retained output instead
// of failing, keeping the first 64 MiB.
const MAX_CAPTURED_OUTPUT = 64 * 1024 * 1024;

const CALIBRATION_RUNS = 20;

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
  /** Memory series + exact peak; undefined when /proc is unavailable. */
  memory: MemorySeries | undefined;
}

/**
 * Run a command without measuring it (prerequisite steps, --prepare hooks).
 */
export async function runPlain(
  command: string,
  options: RunOptions,
): Promise<void> {
  await execute(command, options);
}

/**
 * Run a command once and measure wall-clock, CPU and memory.
 *
 * `timingPath` is where bash's `time` builtin writes its report; callers pass
 * a path in their temp dir so a crashed run leaves diagnosable state behind.
 */
export async function runMeasured(
  command: string,
  timingPath: string,
  options: RunOptions,
): Promise<MeasuredRun> {
  const calibration = await shellSpawnOverheadSeconds();

  const sampler = procSamplingAvailable() ? new MemorySampler() : undefined;
  const { wallSeconds } = await execute(
    wrapWithCpuTiming(command, timingPath),
    options,
    sampler,
  );
  const memory = sampler?.stop();

  const cpu = parseCpuTiming(readFileSync(timingPath, "utf-8"), timingPath);

  return {
    wallSeconds: Math.max(0, wallSeconds - calibration),
    user: cpu.user,
    system: cpu.system,
    memory,
  };
}

export interface SeriesOptions extends RunOptions {
  /** Number of measured runs. */
  runs: number;
  /** Unmeasured warm-up runs before the measured ones (default 0). */
  warmup?: number;
  /** Command to run, unmeasured, before each run (including warm-ups). */
  prepare?: string;
}

/**
 * Run a command `runs` times and measure each run, with hyperfine-compatible
 * `warmup` and `prepare` semantics: warm-up runs execute unmeasured first,
 * and `prepare` runs unmeasured before every run, warm-ups included.
 * `ignoreFailure` applies to the benchmarked command only, never to prepare.
 */
export async function runSeries(
  command: string,
  timingPath: string,
  options: SeriesOptions,
): Promise<MeasuredRun[]> {
  const { runs, warmup = 0, prepare, ...runOptions } = options;
  const prepareOptions = { ...runOptions, ignoreFailure: false };

  for (let i = 0; i < warmup; i++) {
    if (prepare !== undefined) {
      await runPlain(prepare, prepareOptions);
    }

    await runPlain(command, runOptions);
  }

  const results: MeasuredRun[] = [];

  for (let i = 0; i < runs; i++) {
    if (prepare !== undefined) {
      await runPlain(prepare, prepareOptions);
    }

    results.push(await runMeasured(command, timingPath, runOptions));
  }

  return results;
}

/**
 * Wrap a shell command so bash's `time` builtin writes the tree's CPU usage
 * ("<user> <system>", in seconds) to `timingPath`. The command's own stderr
 * detours through fd 3 back to the real stderr (so failures surface whole);
 * only `time`'s report reaches `timingPath`. LC_NUMERIC pins bash's
 * locale-dependent decimal separator.
 */
export function wrapWithCpuTiming(command: string, timingPath: string): string {
  return `{ LC_NUMERIC=C; TIMEFORMAT='%U %S'; time { ${command}\n} 2>&3 ; } 3>&2 2>${shellQuote(timingPath)}`;
}

/** Parse the "<user> <system>" report written by {@link wrapWithCpuTiming}. */
export function parseCpuTiming(
  raw: string,
  source: string,
): { user: number; system: number } {
  const [user, system] = raw.trim().split(/\s+/).map(Number);

  if (!Number.isFinite(user) || !Number.isFinite(system)) {
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
 * Render captured output streams for an error message, mirroring the layout
 * previously produced for execSync failures. Failures are rare and abort the
 * benchmark, so the whole output is shown rather than a tail — a compiler
 * error can sit thousands of warning lines above the end.
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

/** A command failure, carrying the captured output like execSync errors did. */
export class CommandFailedError extends Error {
  public readonly stdout: string;
  public readonly stderr: string;

  constructor(message: string, stdout: string, stderr: string) {
    super(message);
    this.stdout = stdout;
    this.stderr = stderr;
  }
}

let cachedShellSpawnOverhead: Promise<number> | undefined;

/**
 * Mean wall-clock cost of everything a measured run pays besides the command
 * itself: Node's spawn, bash startup and the `time` wrapper. Measured once
 * per process by timing the wrapped no-op command `:` {@link CALIBRATION_RUNS}
 * times, then subtracted from every measurement (hyperfine applies the same
 * shell-spawn calibration). Costs ~100 ms once per driver invocation.
 */
export function shellSpawnOverheadSeconds(): Promise<number> {
  if (cachedShellSpawnOverhead === undefined) {
    cachedShellSpawnOverhead = measureShellSpawnOverhead();
  }

  return cachedShellSpawnOverhead;
}

async function measureShellSpawnOverhead(): Promise<number> {
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

    return walls.reduce((sum, w) => sum + w, 0) / walls.length;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// Spawn `bash -c command`, capture (or pass through) its output, and time it.
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
    });

    child.on("close", (code, signal) => {
      if (code === 0 || options.ignoreFailure === true) {
        resolve({ wallSeconds });
        return;
      }

      const reason =
        signal !== null
          ? `was killed by signal ${signal}`
          : `exited with code ${String(code)}`;

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

// Accumulates stream chunks up to MAX_CAPTURED_OUTPUT, then drops the rest
// (with a truncation marker) instead of failing the run.
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

    return this.truncated ? `${text}\n[output truncated at 64 MiB]` : text;
  }
}
