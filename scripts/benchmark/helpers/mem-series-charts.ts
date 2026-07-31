import {
  decodeSeriesTable,
  fiveNumberSummary,
  pickRepresentativeRun,
  type SeriesTable,
} from "./mem-series.ts";

/**
 * Normalization of benchmark report files into the chart model rendered by
 * `pnpm bench:render:mem-series`. Two on-disk formats are accepted, auto-detected by
 * shape:
 *
 * - a regression report (`pnpm bench:regression --output`): a flat array of
 *   entries, of which the "<scenario> / <name> (mem over time)" ones carry a
 *   memory series in their `extra`;
 * - a bench export (`pnpm bench --export-json`): hyperfine's `{ results }`
 *   shape where each result holds one raw series per run in `memory`.
 *
 * A single report yields one chart per scenario+command combo with the
 * per-process breakdown of the representative run. Multiple reports merge
 * combos found in more than one file into a single chart with one tree-total
 * line per file (a per-file per-process split would multiply lines beyond
 * readability — graph a single file for the breakdown).
 */

const MEM_ENTRY_SUFFIX = " (mem over time)";

// Joins the scenario id and the command/step name in a regression entry's
// name, e.g. "ens-verifiable-factory / cold compile".
const SCENARIO_SEPARATOR = " / ";

/** Summary statistics of one run, shown in the table under a chart. */
export interface RunStats {
  durationMs: number;
  peakRssMb?: number;
  /** [p0, p25, p50, p75, p100] of the run's tree-total RSS. */
  total?: number[];
}

/** One drawable line: a time axis (ms) and MB values. */
export interface ChartLine {
  label: string;
  tMs: number[];
  mb: number[];
  /**
   * total = the emphasized tree-total line; process = one per-process label;
   * report = one file's tree total when comparing several reports.
   */
  kind: "total" | "process" | "report";
}

/** One chart from one report file. */
export interface ReportChart {
  /** Scenario id (first name segment); bench exports have none. */
  scenario: string | undefined;
  /** Command/step name (second segment), or the benchmarked command. */
  benchmark: string;
  lines: ChartLine[];
  runs: RunStats[];
}

/** One rendered chart, possibly merging the same combo across reports. */
export interface MemChart {
  title: string;
  lines: ChartLine[];
  /** Per-run statistics, grouped per contributing report. */
  runTables: Array<{ report?: string; runs: RunStats[] }>;
}

interface MemEntryExtra {
  representativeRun: number;
  seriesGz?: string;
  series?: SeriesTable;
  runs: Array<{ durationMs: number; peakRssMb: number; total: number[] }>;
}

interface BenchExportResult {
  command: string;
  memory?: Array<({ peakRssMb: number } & SeriesTable) | null>;
}

/** A report file's detected format. */
export type ReportFormat = "regression" | "bench-export";

/** The outcome of {@link collectCharts}: a file's charts and its format. */
export interface CollectedReport {
  format: ReportFormat;
  charts: ReportChart[];
}

/**
 * Extract the charts of one report file, auto-detecting its format. Files
 * without any memory series (e.g. produced on macOS) yield an empty list.
 * Throws on unrecognized file shapes; an individual entry whose series cannot
 * be decoded (e.g. written by an older format revision) is skipped and
 * reported through `onWarn`.
 */
export function collectCharts(
  report: unknown,
  onWarn: (message: string) => void = () => {},
): CollectedReport {
  if (Array.isArray(report)) {
    return {
      format: "regression",
      charts: collectRegressionCharts(report, onWarn),
    };
  }

  if (
    typeof report === "object" &&
    report !== null &&
    Array.isArray((report as { results?: unknown }).results)
  ) {
    return {
      format: "bench-export",
      charts: collectBenchExportCharts(
        (report as { results: BenchExportResult[] }).results,
      ),
    };
  }

  throw new Error(
    "Unrecognized report shape: expected a regression report (array of " +
      "entries) or a bench export ({ results: [...] })",
  );
}

function collectRegressionCharts(
  entries: unknown[],
  onWarn: (message: string) => void,
): ReportChart[] {
  const charts: ReportChart[] = [];

  for (const entry of entries) {
    const { name, extra } = entry as { name?: string; extra?: string };

    if (
      typeof name !== "string" ||
      typeof extra !== "string" ||
      !name.endsWith(MEM_ENTRY_SUFFIX)
    ) {
      continue;
    }

    const combo = name.slice(0, -MEM_ENTRY_SUFFIX.length);
    const separator = combo.indexOf(SCENARIO_SEPARATOR);

    let parsed: MemEntryExtra;
    let table: SeriesTable;

    try {
      parsed = JSON.parse(extra) as MemEntryExtra;
      table = decodeSeriesTable(parsed);
    } catch (error) {
      onWarn(
        `Skipping "${name}": ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }

    charts.push({
      scenario: separator === -1 ? undefined : combo.slice(0, separator),
      benchmark:
        separator === -1
          ? combo
          : combo.slice(separator + SCENARIO_SEPARATOR.length),
      lines: tableToLines(table),
      runs: parsed.runs,
    });
  }

  return charts;
}

function collectBenchExportCharts(results: BenchExportResult[]): ReportChart[] {
  const charts: ReportChart[] = [];

  for (const result of results) {
    const runs = (result.memory ?? []).filter((m) => m !== null);

    if (runs.length === 0) {
      continue;
    }

    const representative = pickRepresentativeRun(runs.map((r) => r.peakRssMb));

    // Only the representative run is drawn; the other runs' statistics are
    // already shown in the per-run table under the chart.
    charts.push({
      scenario: undefined,
      benchmark: result.command,
      lines: tableToLines(runs[representative]),
      runs: runs.map((run) => ({
        durationMs: run.tMs[run.tMs.length - 1] ?? 0,
        peakRssMb: run.peakRssMb,
        total:
          run.tMs.length > 0 ? fiveNumberSummary(sumByProcess(run)) : undefined,
      })),
    });
  }

  return charts;
}

/** The per-process lines of a series table plus its emphasized tree total. */
function tableToLines(table: SeriesTable): ChartLine[] {
  const lines: ChartLine[] = Object.entries(table.byProcess).map(
    ([label, mb]) => ({ label, tMs: table.tMs, mb, kind: "process" }),
  );

  lines.push({
    label: "total",
    tMs: table.tMs,
    mb: sumByProcess(table),
    kind: "total",
  });

  return lines;
}

function sumByProcess(table: SeriesTable): number[] {
  return table.tMs.map((_, i) =>
    Object.values(table.byProcess).reduce((sum, mb) => sum + (mb[i] ?? 0), 0),
  );
}

/**
 * A chart's scenario+benchmark combo name — the chart title, and the key
 * charts of the same combo are merged under. Bench exports have no scenario,
 * so their combo is the benchmarked command alone.
 */
function comboName(chart: ReportChart): string {
  return chart.scenario === undefined
    ? chart.benchmark
    : `${chart.scenario}${SCENARIO_SEPARATOR}${chart.benchmark}`;
}

/**
 * Merge the charts of all report files into the rendered chart list, keyed by
 * scenario+benchmark in order of first appearance. A combo found in a single
 * report keeps its full line set; a combo found in several reports collapses
 * each report's lines to its tree total, relabeled to the report's name.
 */
export function mergeCharts(
  reports: Array<{ name: string; charts: ReportChart[] }>,
): MemChart[] {
  const merged = new Map<
    string,
    Array<{ report: string; chart: ReportChart }>
  >();

  for (const { name, charts } of reports) {
    for (const chart of charts) {
      const key = comboName(chart);
      const group = merged.get(key) ?? [];
      group.push({ report: name, chart });
      merged.set(key, group);
    }
  }

  return [...merged].map(([, group]) => {
    const title = comboName(group[0].chart);

    if (group.length === 1) {
      const { report, chart } = group[0];
      return {
        title,
        lines: chart.lines,
        runTables: [
          { report: reports.length > 1 ? report : undefined, runs: chart.runs },
        ],
      };
    }

    return {
      title,
      lines: group.map(({ report, chart }) => {
        const total = chart.lines.find((l) => l.kind === "total");
        return {
          label: report,
          tMs: total?.tMs ?? [],
          mb: total?.mb ?? [],
          kind: "report" as const,
        };
      }),
      runTables: group.map(({ report, chart }) => ({
        report,
        runs: chart.runs,
      })),
    };
  });
}
