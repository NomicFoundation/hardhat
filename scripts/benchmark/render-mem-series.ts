import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  collectCharts,
  mergeCharts,
  type ChartLine,
  type CollectedReport,
  type MemChart,
} from "./helpers/mem-series-charts.ts";
import { compilePatterns, matchesAny, parseGlobList } from "./helpers/plan.ts";
import { fmt, log, logError, logWarning } from "./helpers/log.ts";

const USAGE = `
scripts/benchmark/render-mem-series.ts — Render memory-over-time graphs from benchmark reports

DESCRIPTION
  Reads one or more benchmark report files and writes a self-contained HTML
  page with one memory-over-time line chart per scenario+command combo.
  Accepted formats, auto-detected per file:

  - a regression report ("pnpm bench:regression --output <file>"), using its
    "<scenario> / <name> (memory)" entries;
  - a benchmark export ("pnpm bench --export-json <file>"), using each
    result's per-run memory series.

  With a single report, each chart breaks the representative run down into one
  line per process (hardhat, solc, ...) plus an emphasized tree-total line.
  The other runs' statistics are listed in the table under the chart.

  With multiple reports (at most 24), scenario+command combos that appear in
  several files are combined into one chart with one tree-total line per file.
  Render the graph of a single file to get its per-process breakdown.

  Lines are told apart by hue and line style combined: the palette's 8
  colorblind-validated hues are handed out solid first, then dashed, then
  dotted (24 distinct lines). Same-hue lines differ only in style, so lean on
  the legend and tooltip when many files or processes are in play.

OPTIONS
  --output <path>       HTML destination (default: first report with .html
                        extension)
  --scenarios <globs>   Only include matching scenario ids (comma-separated
                        glob patterns, e.g. "ens-*"). Only available for
                        regression reports: the CLI errors when a bench
                        export is among the report files.
  --benchmarks <globs>  Only include matching command/step names (comma-
                        separated glob patterns, e.g. "*compile*"). Only
                        available for regression reports, like --scenarios.

EXAMPLES
  pnpm bench:render:mem-series /tmp/regression.json
  pnpm bench:render:mem-series before.json after.json --benchmarks "cold compile"
  pnpm bench:render:mem-series r.json --scenarios "1inch*" --output /tmp/memory.html
`;

interface GraphArgs {
  reports: string[];
  output: string;
  scenarios: string[] | undefined;
  benchmarks: string[] | undefined;
}

async function main(): Promise<void> {
  const args = resolveArgs(process.argv.slice(2));

  if (args === undefined) {
    console.log(USAGE);
    return;
  }

  const reports = args.reports.map((file) => ({
    file,
    name: reportName(file, args.reports),
    ...loadReportCharts(file),
  }));

  if (args.scenarios !== undefined || args.benchmarks !== undefined) {
    const benchExport = reports.find((r) => r.format === "bench-export");

    if (benchExport !== undefined) {
      logError(
        "--scenarios and --benchmarks are only available for regression " +
          `reports; ${benchExport.file} is a bench export ` +
          '("pnpm bench --export-json" output)',
      );
      process.exit(1);
    }
  }

  const scenarioPatterns = compilePatterns(args.scenarios);
  const benchmarkPatterns = compilePatterns(args.benchmarks);

  for (const report of reports) {
    report.charts = report.charts.filter(
      (chart) =>
        // A chart without a scenario id can never match a scenario pattern.
        matchesAny(chart.scenario ?? "", scenarioPatterns) &&
        matchesAny(chart.benchmark, benchmarkPatterns),
    );
  }

  const charts = mergeCharts(reports);

  if (charts.length === 0) {
    logError(
      "No memory series matched. Check the report files (memory requires a " +
        "Linux run) and the --scenarios/--benchmarks filters.",
    );
    process.exit(1);
  }

  writeFileSync(args.output, renderHtml(charts));
  log(
    `${fmt.success("Wrote")} ${charts.length} chart${charts.length === 1 ? "" : "s"} to ${fmt.pkg(args.output)}`,
  );
}

function resolveArgs(argv: string[]): GraphArgs | undefined {
  const reports: string[] = [];
  let output: string | undefined;
  let scenarios: string | undefined;
  let benchmarks: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      case "--help":
      case "-h":
        return undefined;
      case "--output":
        output = argv[++i];
        break;
      case "--scenarios":
        scenarios = argv[++i];
        break;
      case "--benchmarks":
        benchmarks = argv[++i];
        break;
      default:
        if (arg.startsWith("-")) {
          logError(`Unknown option: ${arg}`);
          console.log(USAGE);
          process.exit(1);
        }

        reports.push(arg);
    }
  }

  if (reports.length === 0) {
    return undefined;
  }

  if (reports.length > MAX_SLOTS) {
    logError(
      `At most ${MAX_SLOTS} report files can be compared (8 hues × 3 line ` +
        "styles, one hue+style combination per file)",
    );
    process.exit(1);
  }

  return {
    reports,
    output:
      output ??
      path.format({
        ...path.parse(reports[0]),
        base: undefined,
        ext: ".html",
      }),
    scenarios: parseGlobList(scenarios),
    benchmarks: parseGlobList(benchmarks),
  };
}

/** Label reports by basename; fall back to the full path on collisions. */
function reportName(file: string, all: string[]): string {
  const base = path.basename(file);

  return all.filter((f) => path.basename(f) === base).length > 1 ? file : base;
}

function loadReportCharts(file: string): CollectedReport {
  let raw: string;

  try {
    raw = readFileSync(file, "utf-8");
  } catch (error) {
    logError(
      `Cannot read report ${file}: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }

  try {
    return collectCharts(JSON.parse(raw), (message) =>
      logWarning(`${file}: ${message}`),
    );
  } catch (error) {
    logError(
      `Cannot parse report ${file}: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}

// Rendering ------------------------------------------------------------------

// A line's identity is encoded as a hue+style slot: the palette's 8
// colorblind-validated hues are handed out solid first, then dashed, then
// dotted, giving 8 × 3 distinct line identities (same-hue lines differ only
// in style, so the legend and tooltip carry the exact identity). Report lines
// (one per compared file) claim slots first, the largest process labels fill
// the remainder, and the remaining (smallest) process labels are folded into
// a single gray "other" line per chart. "total" and "other" lines don't
// consume slots (they use the ink and muted colors).
const HUE_COUNT = 8;
const STYLE_COUNT = 3;
const MAX_SLOTS = HUE_COUNT * STYLE_COUNT;

/**
 * Fold rare process labels into "other" and return the global slot order
 * (report names first, then process labels ranked by their peak MB anywhere),
 * so that a label keeps the same hue+style in every chart (the encoding
 * follows the entity, not its per-chart rank).
 */
export function assignLabels(charts: MemChart[]): string[] {
  const reportLabels: string[] = [];
  const peaks = new Map<string, number>();

  for (const chart of charts) {
    for (const line of chart.lines) {
      if (line.kind === "report" && !reportLabels.includes(line.label)) {
        reportLabels.push(line.label);
      } else if (line.kind === "process") {
        const peak = Math.max(0, ...line.mb);
        peaks.set(line.label, Math.max(peaks.get(line.label) ?? 0, peak));
      }
    }
  }

  const ranked = [...peaks].sort((a, b) => b[1] - a[1]).map(([label]) => label);
  const kept = ranked.slice(0, Math.max(0, MAX_SLOTS - reportLabels.length));

  if (ranked.length > kept.length) {
    for (const chart of charts) {
      const folded = chart.lines.filter(
        (l) => l.kind === "process" && !kept.includes(l.label),
      );

      if (folded.length === 0) {
        continue;
      }

      chart.lines = chart.lines.filter((l) => !folded.includes(l));
      chart.lines.splice(chart.lines.length - 1, 0, foldLines(folded));
    }
  }

  return [...reportLabels, ...kept];
}

function foldLines(lines: ChartLine[]): ChartLine {
  const tMs = lines[0].tMs;

  return {
    label: "other",
    tMs,
    mb: tMs.map((_, i) => lines.reduce((sum, l) => sum + (l.mb[i] ?? 0), 0)),
    kind: "process",
  };
}

// The page template (see its header comment for the design); rendering
// replaces its __DATA__ placeholder with the chart data.
const TEMPLATE_PATH = path.join(
  import.meta.dirname,
  "render-mem-series.template.html",
);

function renderHtml(charts: MemChart[]): string {
  const labels = assignLabels(charts);
  const data = JSON.stringify({ charts, labels }).replace(/</g, "\\u003c");

  // A replacer function inserts the JSON literally — with a string
  // replacement, "$"-sequences in the data (e.g. a "$&" in a benchmark
  // command) would be interpreted as substitution patterns.
  return readFileSync(TEMPLATE_PATH, "utf-8").replace("__DATA__", () => data);
}

if (import.meta.main) {
  await main();
}
