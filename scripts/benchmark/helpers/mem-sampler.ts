import { existsSync, readFileSync, readdirSync } from "node:fs";

/**
 * Peak-RSS tracking via Linux /proc.
 *
 * While a benchmarked command runs, {@link MemorySampler} walks its process
 * tree every {@link SAMPLE_INTERVAL_MS} and reads each process's VmHWM from
 * /proc/<pid>/status — the kernel's exact per-process peak-RSS high-water
 * mark (the counter behind GNU time's %M). VmHWM must be read while the
 * process is alive: /proc/<pid> disappears at exit. Post-mortem rusage is
 * visible only to the process's parent (the spawned bash), not to this
 * driver, so a process that lives and dies between samples is missed
 * entirely. The reported peak is the max over any single process, matching
 * GNU time's semantics (not a sum). A process can reach its peak in the
 * last few tens of milliseconds before it exits, so the interval has to
 * stay well below that ramp: at 100 ms, sub-second commands came out up to
 * 47% too low. One walk costs ~150 µs over a four-process tree and ~1 ms
 * over a thirty-process one, so even at this interval the otherwise-idle
 * driver stays well under one core.
 */

export const SAMPLE_INTERVAL_MS = 10;

const KB_PER_MB = 1024;

/**
 * Every peak-RSS source must round through here, or the tracked "(peak RSS)"
 * series jumps when the runner switches between GNU time and the sampler.
 */
export function kbToMb(kb: number): number {
  return Math.round(kb / KB_PER_MB);
}

let cachedAvailable: boolean | undefined;

// Whether /proc exposes memory counters and the child list the tree walk
// needs (Linux with CONFIG_PROC_CHILDREN). Memory measurement is
// best-effort: when unavailable (e.g. macOS) callers skip the memory
// entries rather than failing the benchmark.
export function procSamplingAvailable(): boolean {
  if (cachedAvailable === undefined) {
    cachedAvailable =
      existsSync("/proc/self/status") &&
      existsSync(`/proc/self/task/${process.pid}/children`);
  }

  return cachedAvailable;
}

/**
 * Tracks the peak RSS of the process tree rooted at a PID on a fixed
 * interval. Usage: construct, `start(pid)` right after spawning, `stop()`
 * after the child exits. The interval timer is unref'd so it never keeps the
 * driver alive.
 */
export class MemorySampler {
  private peakRssKb: number = 0;
  private sawProcess: boolean = false;
  private timer: NodeJS.Timeout | undefined;

  public start(rootPid: number): void {
    this.sample(rootPid);
    this.timer = setInterval(() => this.sample(rootPid), SAMPLE_INTERVAL_MS);
    this.timer.unref();
  }

  /**
   * The peak RSS of the tree's largest sampled process, in MB — undefined
   * when no process could be read (the whole tree exited before the first
   * sample).
   */
  public stop(): number | undefined {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    return this.sawProcess ? kbToMb(this.peakRssKb) : undefined;
  }

  private sample(rootPid: number): void {
    const stack = [rootPid];

    while (stack.length > 0) {
      const pid = stack.pop();

      if (pid === undefined) {
        break;
      }

      stack.push(...childPids(pid));

      const vmHwmKb = readVmHwmKb(pid);

      if (vmHwmKb === undefined) {
        continue;
      }

      this.sawProcess = true;

      if (vmHwmKb > this.peakRssKb) {
        this.peakRssKb = vmHwmKb;
      }
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

// Read a process's VmHWM. Returns undefined for processes that exited
// mid-walk or have no memory counters (zombies, kernel threads).
function readVmHwmKb(pid: number): number | undefined {
  let status: string;

  try {
    status = readFileSync(`/proc/${pid}/status`, "utf-8");
  } catch {
    return undefined;
  }

  return parseKbField(status, "VmHWM");
}

/** Parse a "<Field>: <n> kB" line from /proc/<pid>/status content. */
export function parseKbField(
  status: string,
  field: string,
): number | undefined {
  const match = status.match(new RegExp(`^${field}:\\s+(\\d+) kB$`, "m"));

  return match !== null ? Number(match[1]) : undefined;
}
