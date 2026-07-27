import { existsSync, readFileSync, readdirSync } from "node:fs";
import { performance } from "node:perf_hooks";
import path from "node:path";
import { gzipSync } from "node:zlib";

/**
 * Memory-over-time sampling via Linux /proc.
 *
 * While a benchmarked command runs, {@link MemorySampler} walks its process
 * tree every {@link SAMPLE_INTERVAL_MS} and records, per process label (see
 * {@link processLabel}), the current resident set size (VmRSS) summed across
 * same-label processes. One full sample costs ~50–200 µs and runs in the
 * otherwise-idle driver process, so it doesn't perturb the measured command.
 *
 * The same /proc/<pid>/status read also provides VmHWM — the kernel's exact
 * per-process peak-RSS high-water mark (the counter behind GNU time's %M).
 * The peak must be tracked while sampling: /proc/<pid> disappears the moment
 * a process exits, and post-mortem rusage is only available to the process's
 * parent (the spawned bash), not to this driver. The reported peak is the max
 * over any single process, matching GNU time's semantics (not a sum).
 */

const SAMPLE_INTERVAL_MS = 100;

let cachedAvailable: boolean | undefined;

// Whether /proc exposes per-process memory counters (Linux). Memory
// measurement is best-effort: when unavailable (e.g. macOS) callers skip the
// memory series and report no memory, rather than failing the benchmark.
export function procSamplingAvailable(): boolean {
  if (cachedAvailable === undefined) {
    cachedAvailable = existsSync("/proc/self/status");
  }

  return cachedAvailable;
}

/** One point in time: elapsed ms since sampling started, and MB per label. */
export interface MemorySample {
  tMs: number;
  byLabel: Map<string, number>;
}

/** The memory series of one run plus its exact peak (max single process). */
export interface MemorySeries {
  samples: MemorySample[];
  peakRssMb: number;
}

// Script basenames too generic to identify a process; label these by their
// npm package name instead (e.g. …/node_modules/hardhat/dist/…/cli.js).
const GENERIC_SCRIPT_NAMES = new Set([
  "cli.js",
  "index.js",
  "main.js",
  "bin.js",
]);

/**
 * Derive a plot label for a process from its argv and its kernel name
 * (`Name:` in /proc/<pid>/status, used when argv is empty, e.g. zombies).
 *
 * `node` processes are labeled by the script they run — the basename of the
 * first non-flag argument (`npx`, `solcjs-runner.js`) — so the hardhat
 * process and its Node children are distinguishable. A generic script
 * basename (`cli.js`, `index.js`, …) is resolved to the script's npm package
 * name when it lives under node_modules (e.g. `hardhat`). Everything else is
 * the basename of argv[0] (`solc`, `bash`, `sh`).
 */
export function processLabel(argv: string[], name: string): string {
  if (argv.length === 0 || argv[0] === "") {
    return name;
  }

  const program = path.basename(argv[0]);

  if (program !== "node") {
    return program;
  }

  const script = argv.slice(1).find((arg) => !arg.startsWith("-"));

  if (script === undefined) {
    return program;
  }

  const base = path.basename(script);

  return GENERIC_SCRIPT_NAMES.has(base) ? (packageName(script) ?? base) : base;
}

// The npm package a script path belongs to: the (possibly scoped) segment
// after the last "node_modules/", or undefined outside node_modules. The path
// is normalized first: bin shims resolve through "node_modules/.bin/..", and
// the raw split would name the package ".bin".
function packageName(script: string): string | undefined {
  const segments = path.posix.normalize(script).split("/");
  const idx = segments.lastIndexOf("node_modules");

  if (idx === -1 || idx + 1 >= segments.length) {
    return undefined;
  }

  const pkg = segments[idx + 1];

  return pkg.startsWith("@") && idx + 2 < segments.length
    ? `${pkg}/${segments[idx + 2]}`
    : pkg;
}

/** Compute [p0, p25, p50, p75, p100] with linear interpolation. */
export function fiveNumberSummary(
  values: number[],
): [number, number, number, number, number] {
  if (values.length === 0) {
    throw new Error("fiveNumberSummary requires at least one sample");
  }

  const sorted = [...values].sort((a, b) => a - b);

  const at = (q: number): number => {
    const pos = q * (sorted.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);

    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  };

  return [sorted[0], at(0.25), at(0.5), at(0.75), sorted[sorted.length - 1]];
}

/**
 * Pick the run whose peak is the median across runs (ties and even counts
 * resolve to the earlier run) — the "representative" run whose full series is
 * stored, while other runs keep only summary statistics.
 */
export function pickRepresentativeRun(peaks: number[]): number {
  if (peaks.length === 0) {
    throw new Error("pickRepresentativeRun requires at least one run");
  }

  const order = peaks
    .map((peak, index) => ({ peak, index }))
    .sort((a, b) => a.peak - b.peak || a.index - b.index);

  return order[Math.floor((order.length - 1) / 2)].index;
}

/**
 * Pivot samples into parallel arrays for serialization: one shared time axis
 * and one MB series per label, `0` where a label's processes weren't alive.
 * MB values are rounded to integers to keep the serialized payload small.
 */
export function toSeriesTable(samples: MemorySample[]): SeriesTable {
  const labels: string[] = [];

  for (const sample of samples) {
    for (const label of sample.byLabel.keys()) {
      if (!labels.includes(label)) {
        labels.push(label);
      }
    }
  }

  const byProcess: Record<string, number[]> = {};

  for (const label of labels) {
    byProcess[label] = samples.map((s) =>
      Math.round(s.byLabel.get(label) ?? 0),
    );
  }

  return { tMs: samples.map((s) => Math.round(s.tMs)), byProcess };
}

/** The pivoted series of one run: a shared time axis + one series per label. */
export interface SeriesTable {
  tMs: number[];
  byProcess: Record<string, number[]>;
}

/** Encode as consecutive differences (both axes are near-constant slopes). */
export function deltaEncode(values: number[]): number[] {
  return values.map((value, i) => (i === 0 ? value : value - values[i - 1]));
}

/** Invert {@link deltaEncode}; the dashboard applies the same cumulative sum. */
export function deltaDecode(deltas: number[]): number[] {
  let sum = 0;

  return deltas.map((delta) => (sum += delta));
}

/**
 * Serialize a series table for an entry's `extra` field, compressed when that
 * is smaller (measured on real data: delta-encoding + gzip halves even short
 * ~40-sample series, and long series compress far better):
 *
 * - `{ seriesGz }`: base64 of gzip of the JSON table with every array
 *   delta-encoded. Decode with gunzip (browsers: DecompressionStream("gzip")),
 *   JSON.parse, then a cumulative sum per array.
 * - `{ series }`: the raw table, when compression would not help (tiny runs).
 */
export function encodeSeriesTable(
  table: SeriesTable,
): { seriesGz: string } | { series: SeriesTable } {
  const raw = JSON.stringify(table);
  const seriesGz = gzipSync(
    JSON.stringify({
      tMs: deltaEncode(table.tMs),
      byProcess: Object.fromEntries(
        Object.entries(table.byProcess).map(([label, values]) => [
          label,
          deltaEncode(values),
        ]),
      ),
    }),
  ).toString("base64");

  return seriesGz.length < raw.length ? { seriesGz } : { series: table };
}

/** Sum a sample's per-label MB values — the process tree's total RSS. */
export function treeTotalMb(sample: MemorySample): number {
  let total = 0;

  for (const mb of sample.byLabel.values()) {
    total += mb;
  }

  return total;
}

/**
 * Samples the process tree rooted at a PID on a fixed interval. Usage:
 * construct, `start(pid)` right after spawning, `stop()` after the child
 * exits. The interval timer is unref'd so it never keeps the driver alive.
 */
export class MemorySampler {
  private samples: MemorySample[] = [];
  private peakRssKb: number = 0;
  private timer: NodeJS.Timeout | undefined;
  private startedAt: number = 0;

  public start(rootPid: number): void {
    this.startedAt = performance.now();
    this.sample(rootPid);
    this.timer = setInterval(() => this.sample(rootPid), SAMPLE_INTERVAL_MS);
    this.timer.unref();
  }

  public stop(): MemorySeries {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    return {
      samples: this.samples,
      peakRssMb: Math.round(this.peakRssKb / 1024),
    };
  }

  private sample(rootPid: number): void {
    const byLabel = new Map<string, number>();
    const stack = [rootPid];

    while (stack.length > 0) {
      const pid = stack.pop();

      if (pid === undefined) {
        break;
      }

      stack.push(...childPids(pid));

      const reading = readProcess(pid);

      if (reading === undefined) {
        continue;
      }

      byLabel.set(
        reading.label,
        (byLabel.get(reading.label) ?? 0) + reading.vmRssKb / 1024,
      );

      if (reading.vmHwmKb > this.peakRssKb) {
        this.peakRssKb = reading.vmHwmKb;
      }
    }

    // The whole tree already exited (e.g. a timer tick between the root's
    // exit and stop()) — an empty sample carries no information.
    if (byLabel.size > 0) {
      this.samples.push({ tMs: performance.now() - this.startedAt, byLabel });
    }
  }
}

// The children of every thread of a process, via /proc/<pid>/task/*/children
// (available since Linux 3.5). Processes can exit mid-walk; treat unreadable
// entries as having no children.
function childPids(pid: number): number[] {
  const pids: number[] = [];

  let tasks: string[];

  try {
    tasks = readdirSync(`/proc/${pid}/task`);
  } catch {
    return pids;
  }

  for (const task of tasks) {
    let children: string;

    try {
      children = readFileSync(`/proc/${pid}/task/${task}/children`, "utf-8");
    } catch {
      continue;
    }

    for (const child of children.trim().split(/\s+/)) {
      if (child !== "") {
        pids.push(Number(child));
      }
    }
  }

  return pids;
}

interface ProcessReading {
  label: string;
  vmRssKb: number;
  vmHwmKb: number;
}

// Read a process's label and memory counters. A single /proc/<pid>/status
// read provides the name, current RSS and the exact lifetime peak (VmHWM).
// Returns undefined for processes that exited mid-walk or have no memory
// counters (zombies, kernel threads).
function readProcess(pid: number): ProcessReading | undefined {
  let status: string;
  let cmdline: string;

  try {
    status = readFileSync(`/proc/${pid}/status`, "utf-8");
    cmdline = readFileSync(`/proc/${pid}/cmdline`, "utf-8");
  } catch {
    return undefined;
  }

  const name = status.match(/^Name:\s+(.*)$/m)?.[1] ?? String(pid);
  const vmRssKb = readKbField(status, "VmRSS");
  const vmHwmKb = readKbField(status, "VmHWM");

  if (vmRssKb === undefined || vmHwmKb === undefined) {
    return undefined;
  }

  const argv = cmdline.split("\0").filter((arg) => arg !== "");

  return { label: processLabel(argv, name), vmRssKb, vmHwmKb };
}

function readKbField(status: string, field: string): number | undefined {
  const match = status.match(new RegExp(`^${field}:\\s+(\\d+) kB$`, "m"));

  return match !== null ? Number(match[1]) : undefined;
}
