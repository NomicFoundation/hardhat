import { performance } from "node:perf_hooks";

/**
 * A tracker for measuring the performance of an operation and its subphases.
 * It leverages Node's performance APIs under the hood.
 *
 * NOTE: This interface was built to support `hardhat-mocha`, you should
 * consider carefully whether its approach applies in your context.
 *
 * The tracker assumes an overarching operation, and a set of subphases. The
 * overarching operation needs an explicit start and end, as do each of the
 * subphases. Finally the results should be logged to debug, and a call to
 * `clear()` made to clean up the underlying performance marks and measures.
 *
 * @example
 * ```typescript
 * type PerformancePhase =
 *   | "Build"
 *   | "Reporting";
 *
 * const performanceScope = "hardhat:mocha:performance";
 * const performanceLog = debug(performanceScope);
 * const perf = createPerformanceTracker<PerformancePhase>(
 *   performanceScope,
 *   "Mocha test task",
 * );
 *
 * perf.start();
 *
 * perf.startPhase("Build");
 * // build...
 * perf.endPhase("Build");
 * perf.startPhase("Reporting");
 * // Report ...
 * perf.endPhase("Reporting");
 *
 * perf.end();
 *
 * perf.logInto(performanceLog);
 * perf.clear();
 * ```
 *
 * @typeParam PhaseT - A string union of the valid phase names e.g.
 * "Build" | "Reporting"
 */
export interface PerformanceTracker<PhaseT extends string> {
  /**
   * Mark the start of the overarching operation.
   */
  start(): void;

  /**
   * Mark the end of the overarching operation and record its duration
   * as a performance measure.
   */
  end(): void;

  /**
   * Mark the start of a sub-phase within the overarching operation.
   *
   * @param phase - The name of the phase to start.
   */
  startPhase(phase: PhaseT): void;

  /**
   * Mark the end of a sub-phase and record its duration as a
   * performance measure.
   *
   * @param phase - The name of the phase to end.
   */
  endPhase(phase: PhaseT): void;

  /**
   * Log all recorded measures to the given logging function.
   *
   * The overarching measure is printed unindented, with sub-phases
   * indented beneath it:
   *
   * @example
   * ```shell
   * Mocha test task:   1234.56ms
   *   build:            567.89ms
   *   Test execution:   432.10ms
   * ```
   *
   * @param debugLog - A logging function to output the results.
   */
  logInto(debugLog: (msg: string) => void): void;

  /**
   * Clear all performance marks and measures created by this tracker,
   * resetting it for reuse.
   */
  clear(): void;
}

/**
 * Creates a new performance tracker for measuring an operation and
 * its sub-phases.
 *
 * @param scope - A namespace prefix for performance marks (e.g.
 *   "hardhat:mocha:performance").
 * @param trackerName - The display name for the overarching measure
 *   (e.g. "Mocha test task").
 * @returns A new {@link PerformanceTracker} instance.
 */
export function createPerformanceTracker<PhaseT extends string>(
  scope: string,
  trackerName: string,
): PerformanceTracker<PhaseT> {
  return new PerformanceTrackerImpl<PhaseT>(scope, trackerName);
}

class PerformanceTrackerImpl<PhaseT extends string>
  implements PerformanceTracker<PhaseT>
{
  readonly #scope: string;
  readonly #trackerName: string;
  #seenPhases: string[] = [];

  constructor(scope: string, trackerName: string) {
    this.#scope = scope;
    this.#trackerName = trackerName;
  }

  public start(): void {
    performance.mark(`${this.#markName(this.#trackerName)}:start`);
  }

  public end(): void {
    const markName = this.#markName(this.#trackerName);

    performance.mark(`${markName}:end`);
    performance.measure(
      this.#trackerName,
      `${markName}:start`,
      `${markName}:end`,
    );
  }

  public startPhase(phase: PhaseT): void {
    performance.mark(`${this.#markName(phase)}:start`);
  }

  public endPhase(phase: PhaseT): void {
    const markName = this.#markName(phase);

    performance.mark(`${markName}:end`);
    performance.measure(phase, `${markName}:start`, `${markName}:end`);
    this.#seenPhases.push(phase);
  }

  public logInto(debugLog: (msg: string) => void): void {
    const measures = performance
      .getEntriesByType("measure")
      .filter(
        (m) =>
          m.name === this.#trackerName || this.#seenPhases.includes(m.name),
      );

    const longestMeasureName = measures
      .map(({ name }) =>
        name === this.#trackerName ? name.length + 2 : name.length,
      )
      .reduce((acc, v) => Math.max(acc, v), 0);

    for (const m of measures) {
      const indent: boolean = m.name === this.#trackerName ? false : true;

      const timingIndent = " ".repeat(
        longestMeasureName - m.name.length + (indent ? 1 : 3),
      );

      debugLog(
        `${indent ? "  " : ""}${m.name}:${timingIndent}${m.duration.toFixed(2)}ms`,
      );
    }
  }

  public clear(): void {
    const markName = this.#markName(this.#trackerName);
    performance.clearMarks(`${markName}:start`);
    performance.clearMarks(`${markName}:end`);
    performance.clearMeasures(this.#trackerName);

    for (const phase of this.#seenPhases) {
      const phaseMarkName = this.#markName(phase);
      performance.clearMarks(`${phaseMarkName}:start`);
      performance.clearMarks(`${phaseMarkName}:end`);
      performance.clearMeasures(phase);
    }

    this.#seenPhases = [];
  }

  #markName(phase: string): string {
    return `${this.#scope}:${phase}`;
  }
}
