import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

import { logWarning } from "./log.ts";
import {
  MemorySampler,
  kbToMb,
  procSamplingAvailable,
  SAMPLE_INTERVAL_MS,
} from "./mem-sampler.ts";
import { BASH, shellQuote } from "./shell.ts";

/**
 * Peak-RSS measurement for the benchmark runner.
 *
 * Both methods report the same quantity: the kernel's peak-RSS high-water
 * mark of the largest single process in the tree, never a sum. GNU time
 * reads that mark from wait4()'s rusage, so its reading is exact. It only
 * sees the descendants its wrapper waits for, and it needs the
 * /usr/bin/time binary.
 * The sampler polls /proc and needs neither, at the cost of missing a peak
 * that a process reaches and releases between samples.
 */

export const PeakRssMethod = {
  GnuTime: "GnuTime",
  Sampler: "Sampler",
} as const;

/** How a measured run's peak RSS is captured; see the module comment. */
export type PeakRssMethod = (typeof PeakRssMethod)[keyof typeof PeakRssMethod];

export const GNU_TIME_PATH = "/usr/bin/time";

// GNU time's peak-RSS format specifier; it reports ru_maxrss in kB.
const GNU_TIME_MAX_RSS_FORMAT = "%M";

// macOS/BSD ship a `time` at the same path that lacks -f and -o, and only
// the GNU build names itself in --version.
const GNU_TIME_VERSION_MARKER = "GNU";

const GNU_TIME_DEBIAN_PACKAGE = "time";

const GNU_TIME_UNAVAILABLE =
  `GNU time is unavailable at ${GNU_TIME_PATH} — install the ` +
  `Debian/Ubuntu package "${GNU_TIME_DEBIAN_PACKAGE}" ` +
  `(sudo apt-get install -y ${GNU_TIME_DEBIAN_PACKAGE})`;

const SAMPLER_UNAVAILABLE =
  "Peak-RSS sampling is unavailable (needs Linux /proc with per-task " +
  "children listings)";

let cachedGnuTimeAvailable: boolean | undefined;

/** Whether /usr/bin/time exists and is the GNU implementation. */
export function gnuTimeAvailable(): boolean {
  if (cachedGnuTimeAvailable === undefined) {
    cachedGnuTimeAvailable = detectGnuTime();
  }

  return cachedGnuTimeAvailable;
}

/** Which peak-RSS methods this machine supports. */
export interface PeakRssAvailability {
  gnuTime: boolean;
  sampler: boolean;
}

export function detectPeakRssAvailability(): PeakRssAvailability {
  return { gnuTime: gnuTimeAvailable(), sampler: procSamplingAvailable() };
}

/**
 * Resolve the method a benchmark will measure with, once for the whole
 * series. Falling back warns, and warning per run would flood the log.
 *
 * A `requested` method that this machine cannot provide throws, so an
 * explicit choice never degrades silently. Without a request, GNU time wins
 * for its exactness and the sampler is the fallback. bench:regression always
 * requests GNU time, so the fallback serves ad-hoc callers. An undefined
 * result means neither is available, so memory goes unmeasured.
 */
export function resolvePeakRssMethod(
  requested: PeakRssMethod,
  availability?: PeakRssAvailability,
): PeakRssMethod;
export function resolvePeakRssMethod(
  requested: PeakRssMethod | undefined,
  availability?: PeakRssAvailability,
): PeakRssMethod | undefined;
export function resolvePeakRssMethod(
  requested: PeakRssMethod | undefined,
  availability: PeakRssAvailability = detectPeakRssAvailability(),
): PeakRssMethod | undefined {
  if (requested === PeakRssMethod.GnuTime) {
    if (!availability.gnuTime) {
      throw new Error(GNU_TIME_UNAVAILABLE);
    }

    return PeakRssMethod.GnuTime;
  }

  if (requested === PeakRssMethod.Sampler) {
    if (!availability.sampler) {
      throw new Error(SAMPLER_UNAVAILABLE);
    }

    return PeakRssMethod.Sampler;
  }

  if (availability.gnuTime) {
    return PeakRssMethod.GnuTime;
  }

  if (availability.sampler) {
    logWarning(
      `${GNU_TIME_UNAVAILABLE} — falling back to /proc sampling every ` +
        `${SAMPLE_INTERVAL_MS} ms, which can miss a short-lived peak and ` +
        `costs the driver CPU for every process in the tree while the ` +
        `command runs`,
    );

    return PeakRssMethod.Sampler;
  }

  logWarning(
    `${GNU_TIME_UNAVAILABLE}. ${SAMPLER_UNAVAILABLE}. Memory entries will ` +
      `be skipped (timing is unaffected)`,
  );

  return undefined;
}

/**
 * Wrap a shell command so GNU time writes its peak RSS to `memPath`.
 *
 * GNU time execs a single binary, so the caller's snippet gets its own bash.
 * Quoting the snippet whole keeps its operators out of the wrapper's own
 * command line. The wrapper goes inside the CPU-timing subshell, never
 * around it: bash's `time` builtin must stay the outermost measurement.
 */
export function wrapWithGnuTime(command: string, memPath: string): string {
  return `${GNU_TIME_PATH} -f ${shellQuote(GNU_TIME_MAX_RSS_FORMAT)} -o ${shellQuote(memPath)} ${BASH} -c ${shellQuote(command)}`;
}

/** Parse the peak RSS written by {@link wrapWithGnuTime}, in whole MB. */
export function parseGnuTimeMaxRssMb(raw: string, source: string): number {
  // GNU time prepends a "Command exited …" or "Command terminated …" line
  // when the command failed, so the measurement is the last line. That line
  // must be a lone integer, so a report holding only the prefix line throws
  // instead of yielding NaN.
  const reading = raw.trimEnd().split("\n").at(-1) ?? "";
  const kb = Number(reading);

  if (!/^\d+$/.test(reading) || kb <= 0) {
    throw new Error(
      `Unparseable GNU time output at ${source}: ${JSON.stringify(raw)}`,
    );
  }

  return kbToMb(kb);
}

// GNU time creates the report on start-up and fills it at exit, so a report
// that is missing or still empty means the wrapper died before measuring.
function readGnuTimeReport(memPath: string): string | undefined {
  let raw: string;

  try {
    raw = readFileSync(memPath, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }

    return undefined;
  }

  return raw.trim() === "" ? undefined : raw;
}

/**
 * Captures the peak RSS of one measured run. The caller wraps its command
 * with {@link PeakRssRecorder.wrapCommand} and hands the spawned PID to
 * {@link PeakRssRecorder.observe}. It then reads the result with
 * {@link PeakRssRecorder.finish}, or calls {@link PeakRssRecorder.cancel}
 * when the run did not complete.
 */
export interface PeakRssRecorder {
  wrapCommand(command: string): string;
  observe(pid: number): void;
  /**
   * The run's peak RSS in MB, undefined when nothing was measured. Throws
   * when a measurement was taken but cannot be read.
   */
  finish(): number | undefined;
  /** Release the recorder's resources, discarding any measurement. */
  cancel(): void;
}

/**
 * Build the recorder for an already-resolved method — see
 * {@link resolvePeakRssMethod}. `memPath` is where GNU time writes its
 * report, and the caller clears it before each run. An undefined method
 * records nothing.
 */
export function createPeakRssRecorder(
  method: PeakRssMethod | undefined,
  memPath: string,
): PeakRssRecorder {
  if (method === PeakRssMethod.GnuTime) {
    return {
      ...NO_PEAK_RSS_RECORDER,
      wrapCommand: (command) => wrapWithGnuTime(command, memPath),
      finish: () => {
        const raw = readGnuTimeReport(memPath);

        return raw === undefined
          ? undefined
          : parseGnuTimeMaxRssMb(raw, memPath);
      },
    };
  }

  if (method === PeakRssMethod.Sampler) {
    const sampler = new MemorySampler();

    return {
      ...NO_PEAK_RSS_RECORDER,
      observe: (pid) => sampler.start(pid),
      finish: () => sampler.stop(),
      // A failed run must still clear the sampler's interval.
      cancel: () => void sampler.stop(),
    };
  }

  return NO_PEAK_RSS_RECORDER;
}

const NO_PEAK_RSS_RECORDER: PeakRssRecorder = {
  wrapCommand: (command) => command,
  observe: () => {},
  finish: () => undefined,
  cancel: () => {},
};

function detectGnuTime(): boolean {
  if (!existsSync(GNU_TIME_PATH)) {
    return false;
  }

  try {
    const version = execFileSync(GNU_TIME_PATH, ["--version"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });

    return version.includes(GNU_TIME_VERSION_MARKER);
  } catch {
    return false;
  }
}
