import { readFileSync } from "node:fs";
import path from "node:path";

import type { BenchmarkEntry } from "./helpers/stats.ts";

const USAGE = `
scripts/benchmark/render-solx-tables.ts — Render the solx benchmark report as markdown

DESCRIPTION
  Reads a bench:regression report (customSmallerIsBetter JSON array, the file
  solx-regression-benchmark.yml produces) and prints markdown tables to
  stdout: one cold-compile pivot per scenario ({solc, shipped solx, pinned
  solx} x {no-opt, legacy, via-IR}, wall / total CPU), a cross-tool parity
  table, warm-test and cold-test tables (the whole test command over a
  cached build, and over a clean one where measured), plus a details section
  with the DWARF cost, peak RSS
  and raw-replay numbers. Every entry in the report is rendered — anything
  the pivot doesn't recognize lands in an "other entries" table rather than
  being dropped.

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
    path.join(
      repoRoot,
      "packages/hardhat-slang-solx/src/internal/constants.ts",
    ),
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
  warm: Map<string, CellData>; // "warm test" cells: test command over a cached build
  coldTest: Map<string, CellData>; // "cold test" cells: clean build incl. tests + suite
  warmCompile: Map<string, CellData>; // "warm compile" cells: no-op cache check
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
  "1inch-swap-vm-solx|solx-0.1.8 via-ir": "✗ does not compile³",
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
  "³ solx cannot compile SwapVM's recursive runLoop via-IR: LLVM reports " +
    "a stackification failure for a recursive function with stack-too-deep " +
    "errors. This repo is via-IR only, so solx has no cell here at all. " +
    "solx 0.1.7 exited 0 on the same sources while emitting empty bytecode " +
    "for every contract, so timings recorded before solx 0.1.8 measured a " +
    "build that produced nothing and are not comparable.",
];

// Warm-test cells that legitimately have no number (the FAIL is the datum),
// keyed "<scenario>|<compiler>[ via-ir]" like CELL_NOTES.
const WARM_TEST_NOTES: Record<string, string> = {
  "aave-v4-solx|solc via-ir": "✗ does not compile⁵",
  "1inch-swap-vm-solx|solc via-ir": "✗ tests do not compile⁸",
  "1inch-swap-vm-solx|solx via-ir": "✗ tests do not compile⁸",
};

// Cold-test cells that legitimately have no number, keyed like the warm map.
// The same solc-via-IR failure blocks aave's cold test run (footnote 5).
const COLD_TEST_NOTES: Record<string, string> = {
  "aave-v4-solx|solc via-ir": "✗ does not compile⁵",
};

// Warm-test cells whose number needs a caveat mark appended.
const WARM_TEST_MARKS: Record<string, string> = {
  "openzeppelin-contracts-0.34|solc via-ir": "⁶",
  "solady-solx|solc": "⁷",
  "solady-solx|solc via-ir": "⁷",
  "solady-solx|solx-0.1.8": "⁷",
  "solady-solx|solx-0.1.8 via-ir": "⁷",
};

const WARM_TEST_FOOTNOTES: Record<string, string> = {
  "⁵":
    "⁵ solc via-IR cannot compile aave's Foundry test sources (its cold " +
    "via-IR cells compile src only, mirroring upstream's per-file via-IR " +
    "overrides), so the suite cannot run at all. The failure, not a time, " +
    "is the datum.",
  "⁶":
    "⁶ the suite exits non-zero under solc via-IR: upstream-known test " +
    "failures in solc's via-IR optimizer (BlockhashTest family). The full " +
    "suite still runs — the time is comparable; the cell sets ignoreFailure " +
    "in scenario.json.",
  "⁷":
    "⁷ solady's suite exits non-zero on both compilers: one upstream fuzz " +
    "test (BlockHashLibTest#testBlockHash) reverts on an EDR-generated " +
    "input with an identical counterexample under solc and solx — an " +
    "EDR/test interaction, not a compiler divergence (2040 of 2041 pass). " +
    "The full suite runs; the cells set ignoreFailure in scenario.json.",
  "⁸":
    "⁸ swap-vm's Foundry test sources fail to compile under BOTH compilers " +
    "at the 0.8.34 pin (test-under-solx sweep): the src compiles via-IR " +
    "(the cold-compile rows) but adding the tests breaks each side in its " +
    "own way. Upstream runs its suite via forge at its own 0.8.30 pin — " +
    "not benchmarked here. The repo is via-IR-only, so there is no legacy " +
    "row at all.",
};

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
        : (/^(cold compile|warm compile|warm test|cold test|raw replay) (.*)$/.exec(
            m.groups!.label,
          ) ?? [undefined, undefined, undefined]);
    const cell = cellRaw === undefined ? undefined : parseCell(cellRaw);
    if (m === null || cell === undefined) {
      other.push(entry);
      continue;
    }

    const { scenario: scenarioId } = m.groups!;
    const scenario = scenarios.get(scenarioId) ?? {
      cold: new Map(),
      warm: new Map(),
      coldTest: new Map(),
      warmCompile: new Map(),
      replay: new Map(),
    };
    scenarios.set(scenarioId, scenario);
    const bucket =
      prefix === "cold compile"
        ? scenario.cold
        : prefix === "warm compile"
          ? scenario.warmCompile
          : prefix === "warm test"
            ? scenario.warm
            : prefix === "cold test"
              ? scenario.coldTest
              : scenario.replay;
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
  const compilers = (scenario: Scenario, id: string) => {
    const found = new Set<string>();
    for (const key of scenario.cold.keys()) {
      const c = parseCell(key)!;
      // forge and parity cells feed the cross-tool table below instead
      if (c.parity || c.compiler.startsWith("forge-")) {
        continue;
      }
      found.add(c.compiler);
    }
    // A compiler that produced no entry at all still needs its column when a
    // note explains the absence — otherwise the column disappears and the
    // reader sees no sign the compiler was tried.
    for (const noteKey of Object.keys(CELL_NOTES)) {
      const [noteId, cell] = noteKey.split("|");
      if (noteId === id && cell !== undefined) {
        found.add(cell.replace(/ (no-opt|via-ir|upgrade)$/, ""));
      }
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
      noteSuffix: " via-ir",
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
    const cols = compilers(scenario, id);
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
        return `${wallCpu(scenario.cold.get(fallback))}⁴`;
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

  // Test-suite tables: one row per scenario x pipeline, {solc, solx, forge}
  // columns. Shared by the warm variant ("warm test": the test command over
  // a build cached by the cell's prepare — warm compile check + full suite)
  // and the cold variant ("cold test": clean build including the test
  // sources, plus the suite — measured only where the compile cells are
  // src-scoped and a cold-compile+warm-test sum would understate the first
  // run, i.e. aave).
  const testFootnotesUsed = new Set<string>();
  const renderTestSuiteTable = (
    bucketOf: (s: Scenario) => Map<string, CellData>,
    notes: Record<string, string>,
    marks: Record<string, string>,
    heading: string,
    blurb: string,
  ): void => {
    const rows: string[] = [];
    const solxVersions = new Set<string>();
    const forgeVersions = new Set<string>();
    // A repo that cannot run tests still gets a visible row via its notes,
    // but a table with no measurement anywhere (an old report) renders
    // nothing — its note marks are discarded with it.
    let sawMeasurement = false;
    const footnotesUsed = new Set<string>();
    for (const id of scenarioIds) {
      const bucket = bucketOf(scenarios.get(id)!);
      for (const viaIR of [false, true]) {
        const cellValue = (matchCompiler: (compiler: string) => boolean) => {
          const key = [...bucket.keys()].find((k) => {
            const c = parseCell(k)!;
            return (
              matchCompiler(c.compiler) &&
              c.viaIR === viaIR &&
              c.dwarf &&
              !c.noOpt &&
              !c.parity &&
              !c.upgrade
            );
          });
          if (key === undefined) {
            return undefined;
          }
          const compiler = parseCell(key)!.compiler;
          if (compiler.startsWith("solx-")) {
            solxVersions.add(compiler.replace("solx-", ""));
          } else if (compiler.startsWith("forge-")) {
            forgeVersions.add(compiler.replace("forge-", ""));
          }
          sawMeasurement = true;
          const mark =
            marks[`${id}|${compiler}${viaIR ? " via-ir" : ""}`] ?? "";
          if (mark !== "") {
            footnotesUsed.add(mark);
          }
          return `${wallCpu(bucket.get(key))}${mark}`;
        };
        const noteValue = (compiler: string) => {
          const note = notes[`${id}|${compiler}${viaIR ? " via-ir" : ""}`];
          const mark = /[⁰¹²³⁴⁵⁶⁷⁸⁹]+$/.exec(note ?? "")?.[0];
          if (note !== undefined && mark !== undefined) {
            footnotesUsed.add(mark);
          }
          return note;
        };
        const solc = cellValue((c) => c === "solc") ?? noteValue("solc") ?? "—";
        const solx =
          cellValue((c) => c === "solx" || c.startsWith("solx-")) ??
          noteValue("solx") ??
          "—";
        const forge =
          cellValue((c) => c.startsWith("forge-")) ?? noteValue("forge") ?? "—";
        if (solc !== "—" || solx !== "—" || forge !== "—") {
          rows.push(
            `| ${id} | ${viaIR ? "via-IR" : "legacy"} | ${solc} | ${solx} | ${forge} |`,
          );
        }
      }
    }
    if (rows.length > 0 && sawMeasurement) {
      for (const mark of footnotesUsed) {
        testFootnotesUsed.add(mark);
      }
      const solxLabel =
        solxVersions.size > 0 ? ` ${[...solxVersions].sort().join("/")}` : "";
      const forgeLabel =
        forgeVersions.size > 0 ? ` ${[...forgeVersions].sort().join("/")}` : "";
      lines.push(
        heading,
        "",
        blurb,
        "",
        `| scenario | pipeline | hardhat + solc 0.8.34 | hardhat + solx${solxLabel} | forge${forgeLabel} + solc 0.8.34 |`,
        "|---|---|---|---|---|",
        ...rows,
        "",
      );
    }
  };
  renderTestSuiteTable(
    (s) => s.warm,
    WARM_TEST_NOTES,
    WARM_TEST_MARKS,
    "### Warm test suite <sub>(full test command over a cached build: warm compile check + suite, wall / CPU s)</sub>",
    "Fuzz seeds are pinned on both tools; each tool runs its own upstream-configured suite — compare the pass/fail counts in the run log before comparing times across tools.",
  );
  renderTestSuiteTable(
    (s) => s.coldTest,
    COLD_TEST_NOTES,
    {},
    "### Cold test suite <sub>(clean build including test sources + full suite, wall / CPU s)</sub>",
    "The first test run after a clean, measured directly. Only aave carries these cells: its compile cells are src-only, so a cold-compile + warm-test sum would understate its first run.",
  );

  // Warm compile: a no-op cache check — no compiler runs, so the number is
  // pipeline-independent (Hardhat startup + source hashing; forge analogous).
  // One row per scenario, picking whichever pipeline's cell exists.
  const warmCompileRows: string[] = [];
  for (const id of scenarioIds) {
    const scenario = scenarios.get(id)!;
    if (scenario.warmCompile.size === 0) {
      continue;
    }
    const pick = (matchCompiler: (compiler: string) => boolean) => {
      const key = [...scenario.warmCompile.keys()].find((k) =>
        matchCompiler(parseCell(k)!.compiler),
      );
      return key === undefined ? "—" : wallCpu(scenario.warmCompile.get(key));
    };
    warmCompileRows.push(
      `| ${id} | ${pick((c) => c === "solc")} | ${pick(
        (c) => c === "solx" || c.startsWith("solx-"),
      )} | ${pick((c) => c.startsWith("forge-"))} |`,
    );
  }
  if (warmCompileRows.length > 0) {
    lines.push(
      "### Warm compile <sub>(no-op cache check, wall / CPU s)</sub>",
      "",
      "Nothing recompiles on a warm build, so this is tool startup + source hashing — independent of the compiler and pipeline. It is the compile share of the warm-test numbers above.",
      "",
      "| scenario | hardhat + solc 0.8.34 | hardhat + solx | forge + solc 0.8.34 |",
      "|---|---|---|---|",
      ...warmCompileRows,
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
    for (const [key, data] of scenarios.get(id)!.warm) {
      if (data.peakRssMb !== undefined) {
        rssRows.push(
          `| ${id} | warm test ${key} | ${fmt(data.peakRssMb, 0)} |`,
        );
      }
    }
    for (const [key, data] of scenarios.get(id)!.coldTest) {
      if (data.peakRssMb !== undefined) {
        rssRows.push(
          `| ${id} | cold test ${key} | ${fmt(data.peakRssMb, 0)} |`,
        );
      }
    }
    for (const [key, data] of scenarios.get(id)!.warmCompile) {
      if (data.peakRssMb !== undefined) {
        rssRows.push(
          `| ${id} | warm compile ${key} | ${fmt(data.peakRssMb, 0)} |`,
        );
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
      "⁴ same-scope matrix cell: this scenario's hardhat cells already " +
        "compile the parity source set, so no separate parity cell exists.",
    );
  }
  for (const mark of Object.keys(WARM_TEST_FOOTNOTES)) {
    if (testFootnotesUsed.has(mark)) {
      lines.push(WARM_TEST_FOOTNOTES[mark]);
    }
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
