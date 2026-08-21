import { readFileSync } from "node:fs";
import path from "node:path";

import type { BenchmarkEntry } from "./helpers/stats.ts";

const USAGE = `
scripts/benchmark/render-solx-tables.ts — Render the solx benchmark report as markdown

DESCRIPTION
  Reads a bench:regression report (customSmallerIsBetter JSON array, the file
  solx-regression-benchmark.yml produces) and prints markdown tables to
  stdout: one cold-compile pivot per scenario ({solc, shipped solx, pinned
  solx} x {no-opt, legacy, via-IR}, wall / total CPU), plus a details section
  with the DWARF cost, peak RSS and raw-replay numbers. Every entry in the
  report is rendered — anything the pivot doesn't recognize lands in an
  "other entries" table rather than being dropped.

  The output embeds the ${"<!-- solx-bench-tables -->"} marker so CI can
  upsert it as a single sticky PR comment.

OPTIONS
  --report <path>    Required. Report JSON to render
  --run-url <url>    Link to the producing workflow run
  --head-sha <sha>   Commit the run measured
  --status <status>  Producing job status; anything but "success" adds a
                     partial-results warning

EXAMPLE
  node scripts/benchmark/render-solx-tables.ts --report solx-regression-report.json
`;

export const COMMENT_MARKER = "<!-- solx-bench-tables -->";

// The pinned-comparison cells are named "solx-<version>"; the plain "solx"
// cells measure whatever the plugin ships. Read the shipped version from the
// plugin's map (regex, not an import: constants.ts pulls in hardhat types
// that scripts/tsconfig.json doesn't know about).
export function readShippedSolxVersion(repoRoot: string): string | undefined {
  const constants = readFileSync(
    path.join(repoRoot, "packages/hardhat-solx/src/internal/constants.ts"),
    "utf8",
  );
  return /"0\.8\.34":\s*"(\d+\.\d+\.\d+)"/.exec(constants)?.[1];
}

interface Cell {
  compiler: string; // "solc" | "solx" | "solx-x.y.z" | "forge-x.y.z"
  viaIR: boolean;
  noOpt: boolean;
  dwarf: boolean;
  // parity cells compile the same source set as forge (no exposed wrappers
  // etc.); they feed the cross-tool table, not the per-scenario pivot
  parity: boolean;
  // upgrade cells compile a scenario's upgrade tree instead of its matrix
  // sources (lidofinance-vaults-solx: contracts/upgrade at 0.8.34, which solx
  // builds and solc rejects); they get their own pivot row and stay out of
  // the cross-tool table
  upgrade: boolean;
}

interface CellData {
  wallMean?: number;
  cpuTotal?: number;
  peakRssMb?: number;
  runs?: number;
}

interface Scenario {
  cold: Map<string, CellData>; // key: canonical cell key
  replay: Map<string, CellData>;
}

// "solc no-opt" / "solx-0.1.8 via-ir no-dwarf" -> Cell; undefined if it
// doesn't look like a matrix cell.
export function parseCell(raw: string): Cell | undefined {
  const tokens = raw.split(" ");
  const compiler = tokens.shift();
  if (
    compiler === undefined ||
    !/^(solc|solx(-\d+\.\d+\.\d+)?|forge-\d+\.\d+\.\d+)$/.test(compiler)
  ) {
    return undefined;
  }
  const flags = new Set(tokens);
  const known = new Set(["via-ir", "no-opt", "no-dwarf", "parity", "upgrade"]);
  if ([...flags].some((f) => !known.has(f))) {
    return undefined;
  }
  return {
    compiler,
    viaIR: flags.has("via-ir"),
    noOpt: flags.has("no-opt"),
    dwarf: !flags.has("no-dwarf"),
    parity: flags.has("parity"),
    upgrade: flags.has("upgrade"),
  };
}

// Canonical cell string; feeding it back through parseCell yields the same Cell.
function cellKey(c: Cell): string {
  return [
    c.compiler,
    c.viaIR ? "via-ir" : "",
    c.noOpt ? "no-opt" : "",
    c.parity ? "parity" : "",
    c.upgrade ? "upgrade" : "",
    c.dwarf ? "" : "no-dwarf",
  ]
    .filter(Boolean)
    .join(" ");
}

function fmt(n: number | undefined, digits = 1): string {
  return n === undefined ? "—" : n.toFixed(digits);
}

function wallCpu(d: CellData | undefined): string {
  if (
    d === undefined ||
    (d.wallMean === undefined && d.cpuTotal === undefined)
  ) {
    return "—";
  }
  return `${fmt(d.wallMean)} / ${fmt(d.cpuTotal)}`;
}

// Scenario cells that legitimately have no number: the FAIL is the datum.
// Keep in sync with the scenario's wrapper config, which documents why.
const CELL_NOTES: Record<string, string> = {
  "openzeppelin-contracts-0.34|solc no-opt": "✗ does not compile¹",
  "solady-solx|solc no-opt": "✗ does not compile¹",
  "lidofinance-core-solx|solc": "✗ does not compile¹",
  "lidofinance-core-solx|solc no-opt": "✗ does not compile¹",
  "lidofinance-core-solx|solx-0.1.8": "✗ does not compile¹",
  "lidofinance-vaults-solx|solc": "✗ does not compile¹",
  "lidofinance-vaults-solx|solc no-opt": "✗ does not compile¹",
  "lidofinance-vaults-solx|solx-0.1.8": "✗ does not compile¹",
  "lidofinance-vaults-solx|solc upgrade": "✗ does not compile²",
};

const FOOTNOTES = [
  "¹ the legacy pipeline rejects these sources: solc no-opt hits " +
    "stack-too-deep (OZ: the P256/WebAuthn-family files; solady: " +
    "test/RedBlackTree.t.sol), and lido's vaults tree is IR-only — " +
    "stack-too-deep in SRLib plus a struct-array copy to storage that is " +
    "an UnimplementedFeatureError outside via-IR, for solx too. Reproduce " +
    "with `--build-profile solc-no-opt` (or lido's plain `solx`) in the " +
    "scenario. The failure, not a time, is the datum — see the scenario's " +
    "wrapper config.",
  "² lido's contracts/upgrade builds via-IR at upstream's solc 0.8.25 but " +
    "hits a Yul stack-too-deep from solc 0.8.26 on, at every optimizer " +
    "setting; solx builds it at 0.8.34 by spilling the stack. Reproduce " +
    "with `LIDO_BENCH_SOURCES=upgrade` and `--build-profile solc-via-ir` " +
    "in the lidofinance-vaults-solx scenario. The failure, not a time, is " +
    "the datum.",
];

export function renderSolxTables(
  entries: BenchmarkEntry[],
  opts: {
    shippedVersion?: string;
    runUrl?: string;
    headSha?: string;
    status?: string;
  } = {},
): string {
  const scenarios = new Map<string, Scenario>();
  const other: BenchmarkEntry[] = [];

  for (const entry of entries) {
    const m =
      /^(?<scenario>.+?) \/ (?<label>.+?)(?<kind> \((cpu|peak RSS)\))?$/.exec(
        entry.name,
      );
    const [, prefix, cellRaw] =
      m === null
        ? [undefined, undefined, undefined]
        : (/^(cold compile|raw replay) (.*)$/.exec(m.groups!.label) ?? [
            undefined,
            undefined,
            undefined,
          ]);
    const cell = cellRaw === undefined ? undefined : parseCell(cellRaw);
    if (m === null || cell === undefined) {
      other.push(entry);
      continue;
    }

    const { scenario: scenarioId } = m.groups!;
    const scenario = scenarios.get(scenarioId) ?? {
      cold: new Map(),
      replay: new Map(),
    };
    scenarios.set(scenarioId, scenario);
    const bucket = prefix === "cold compile" ? scenario.cold : scenario.replay;
    const key = cellKey(cell);
    const data = bucket.get(key) ?? {};
    bucket.set(key, data);

    const extra = JSON.parse(entry.extra) as Record<string, unknown>;
    if (m.groups!.kind === undefined) {
      data.wallMean = entry.value;
      if (Array.isArray(extra.times)) {
        data.runs = extra.times.length;
      }
    } else if (m.groups!.kind === " (cpu)") {
      data.cpuTotal = entry.value;
    } else {
      data.peakRssMb = entry.value;
    }
  }

  const scenarioIds = [...scenarios.keys()].sort();
  const compilers = (scenario: Scenario) => {
    const found = new Set<string>();
    for (const key of scenario.cold.keys()) {
      const c = parseCell(key)!;
      // forge and parity cells feed the cross-tool table below instead
      if (c.parity || c.compiler.startsWith("forge-")) {
        continue;
      }
      found.add(c.compiler);
    }
    // solc first, shipped solx second, pinned versions ascending
    return [
      "solc",
      "solx",
      ...[...found].filter((c) => c.startsWith("solx-")).sort(),
    ].filter((c) => found.has(c));
  };
  const compilerHeading = (c: string) =>
    c === "solc"
      ? "solc 0.8.34"
      : c === "solx"
        ? `solx${opts.shippedVersion === undefined ? "" : ` ${opts.shippedVersion}`} (shipped)`
        : c.replace("solx-", "solx ");

  const lines: string[] = [COMMENT_MARKER, "## solx compile benchmarks", ""];
  if (opts.status !== undefined && opts.status !== "success") {
    lines.push(
      `> [!WARNING]`,
      `> Benchmark job status: ${opts.status} — results may be partial.`,
      "",
    );
  }
  const provenance = [
    opts.runUrl === undefined
      ? undefined
      : `generated from [this run](${opts.runUrl})`,
    opts.headSha === undefined ? undefined : `at ${opts.headSha.slice(0, 9)}`,
  ]
    .filter(Boolean)
    .join(" ");
  lines.push(
    `Cold compile, mean wall / total CPU (user+sys) in seconds, DWARF on (the shipped config)${
      provenance === "" ? "" : `; ${provenance}`
    }.`,
    "",
  );

  const rows: Array<{
    title: string;
    noteSuffix: string;
    match: (c: Cell) => boolean;
  }> = [
    {
      title: "legacy, no optimizer",
      noteSuffix: " no-opt",
      match: (c) => c.noOpt && !c.viaIR && !c.upgrade,
    },
    {
      title: "legacy",
      noteSuffix: "",
      match: (c) => !c.noOpt && !c.viaIR && !c.upgrade,
    },
    {
      title: "via-IR",
      noteSuffix: "",
      match: (c) => !c.noOpt && c.viaIR && !c.upgrade,
    },
    {
      title: "via-IR, upgrade tree",
      noteSuffix: " upgrade",
      match: (c) => !c.noOpt && c.viaIR && c.upgrade,
    },
  ];

  for (const id of scenarioIds) {
    const scenario = scenarios.get(id)!;
    const cols = compilers(scenario);
    const runs = [...scenario.cold.values()]
      .map((d) => d.runs)
      .find((r) => r !== undefined);
    lines.push(
      `### ${id}${runs === undefined ? "" : ` <sub>(${runs} runs/cell)</sub>`}`,
      "",
    );
    lines.push(`| cold compile | ${cols.map(compilerHeading).join(" | ")} |`);
    lines.push(`|---|${cols.map(() => "---").join("|")}|`);
    for (const row of rows) {
      const cells = cols.map((compiler) => {
        const key = [...scenario.cold.keys()].find((k) => {
          const c = parseCell(k)!;
          return (
            c.compiler === compiler && c.dwarf && !c.parity && row.match(c)
          );
        });
        const note = CELL_NOTES[`${id}|${compiler}${row.noteSuffix}`];
        return key === undefined
          ? (note ?? "—")
          : wallCpu(scenario.cold.get(key));
      });
      if (cells.some((c) => c !== "—")) {
        lines.push(`| ${row.title} | ${cells.join(" | ")} |`);
      }
    }
    lines.push("");
  }

  // Cross-tool parity: one row per forge cell. Hardhat values come from
  // parity-flagged cells when the scenario has them (OZ: its matrix cells
  // include the exposed wrappers forge never compiles) and fall back to the
  // matrix cells otherwise (uniswap: matrix cells are already parity-scoped).
  const parityRows: string[] = [];
  const forgeVersions = new Set<string>();
  const solxVersions = new Set<string>();
  let parityUsedFallback = false;
  for (const id of scenarioIds) {
    const scenario = scenarios.get(id)!;
    for (const [key, forgeData] of scenario.cold) {
      const fc = parseCell(key)!;
      if (!fc.compiler.startsWith("forge-")) {
        continue;
      }
      forgeVersions.add(fc.compiler.replace("forge-", ""));
      const pick = (compilers: string[]): string => {
        // Compilers are tried in order, so an exact "solx" cell (old reports)
        // wins over a version-pinned one.
        const find = (parity: boolean) => {
          for (const compiler of compilers) {
            const key = [...scenario.cold.keys()].find((k) => {
              const c = parseCell(k)!;
              return (
                c.compiler === compiler &&
                c.parity === parity &&
                c.viaIR === fc.viaIR &&
                c.dwarf &&
                !c.noOpt &&
                !c.upgrade
              );
            });
            if (key !== undefined) {
              return key;
            }
          }
          return undefined;
        };
        const record = (key: string) => {
          const c = parseCell(key)!.compiler;
          if (c.startsWith("solx-")) {
            solxVersions.add(c.replace("solx-", ""));
          }
        };
        const exact = find(true);
        if (exact !== undefined) {
          record(exact);
          return wallCpu(scenario.cold.get(exact));
        }
        const fallback = find(false);
        if (fallback === undefined) {
          return "—";
        }
        record(fallback);
        parityUsedFallback = true;
        return `${wallCpu(scenario.cold.get(fallback))}³`;
      };
      // The solx column matches any solx cell: the version-pinned cells are
      // the shipped measurement since the plugin's map reached 0.1.7 (the
      // redundant shipped cells were retired; old reports still have them).
      const solxCompilers = [
        "solx",
        ...[...scenario.cold.keys()]
          .map((k) => parseCell(k)!.compiler)
          .filter((c) => c.startsWith("solx-"))
          .sort()
          .reverse(),
      ];
      parityRows.push(
        `| ${id} | ${fc.viaIR ? "via-IR" : "legacy"} | ${pick(["solc"])} | ${pick(solxCompilers)} | ${wallCpu(forgeData)} |`,
      );
    }
  }
  if (parityRows.length > 0) {
    const forgeLabel = [...forgeVersions].sort().join("/");
    const solxLabel =
      solxVersions.size > 0
        ? ` ${[...solxVersions].sort().join("/")}`
        : " (shipped)";
    lines.push(
      "### Cross-tool parity <sub>(same sources, same settings, wall / CPU s)</sub>",
      "",
      `| scenario | pipeline | hardhat + solc 0.8.34 | hardhat + solx${solxLabel} | forge ${forgeLabel} + solc 0.8.34 |`,
      "|---|---|---|---|---|",
      ...parityRows,
      "",
    );
  }

  // Secondary numbers: everything is still generated, just folded away.
  // (The DWARF-cost table retired with the no-dwarf cells — final numbers
  // are recorded in PR #8415's description.)
  lines.push("<details>", "<summary>Peak RSS, raw replay</summary>", "");

  const rssRows: string[] = [];
  for (const id of scenarioIds) {
    for (const [key, data] of scenarios.get(id)!.cold) {
      if (data.peakRssMb !== undefined) {
        rssRows.push(`| ${id} | ${key} | ${fmt(data.peakRssMb, 0)} |`);
      }
    }
  }
  if (rssRows.length > 0) {
    lines.push(
      "Peak RSS (highest peak across runs):",
      "",
      "| scenario | cell | MB |",
      "|---|---|---|",
      ...rssRows,
      "",
    );
  }

  const replayRows: string[] = [];
  for (const id of scenarioIds) {
    for (const [key, data] of scenarios.get(id)!.replay) {
      replayRows.push(`| ${id} | ${key} | ${wallCpu(data)} |`);
    }
  }
  if (replayRows.length > 0) {
    lines.push(
      "Raw solx replay over dumped standard JSON (no Hardhat in the loop; the delta vs the matching cold-compile cell is Hardhat's overhead):",
      "",
      "| scenario | cell | wall / CPU (s) |",
      "|---|---|---|",
      ...replayRows,
      "",
    );
  }

  if (other.length > 0) {
    lines.push(
      "Other entries (not part of the cold-compile matrix):",
      "",
      "| entry | value | unit |",
      "|---|---|---|",
      ...other.map((e) => `| ${e.name} | ${fmt(e.value, 2)} | ${e.unit} |`),
      "",
    );
  }

  lines.push("</details>", "", ...FOOTNOTES);
  if (parityUsedFallback) {
    lines.push(
      "³ same-scope matrix cell: this scenario's hardhat cells already " +
        "compile the parity source set, so no separate parity cell exists.",
    );
  }
  return `${lines.join("\n")}\n`;
}

function getArg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i !== -1 && i + 1 < process.argv.length
    ? process.argv[i + 1]
    : undefined;
}

function main(): void {
  const reportPath = getArg("--report");
  if (reportPath === undefined) {
    console.log(USAGE);
    process.exitCode = 1;
    return;
  }
  const entries = JSON.parse(
    readFileSync(reportPath, "utf8"),
  ) as BenchmarkEntry[];
  const repoRoot = path.resolve(import.meta.dirname, "..", "..");
  process.stdout.write(
    renderSolxTables(entries, {
      shippedVersion: readShippedSolxVersion(repoRoot),
      runUrl: getArg("--run-url"),
      headSha: getArg("--head-sha"),
      status: getArg("--status"),
    }),
  );
}

if (process.argv[1] === import.meta.filename) {
  main();
}
