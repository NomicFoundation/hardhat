import type { BenchmarkEntry } from "./helpers/entries.ts";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mergeBaselineReport } from "./merge-baseline-report.ts";

function entry(name: string, value: number, run?: string): BenchmarkEntry {
  return {
    name,
    unit: "s",
    value,
    range: "± 0",
    extra: JSON.stringify({ times: [value], run }),
  };
}

// A cell's three entries, the way bench:regression writes them.
function cell(name: string, wall: number, run?: string): BenchmarkEntry[] {
  return [
    entry(name, wall, run),
    entry(`${name} (peak RSS)`, wall * 100),
    entry(`${name} (cpu)`, wall * 2),
  ];
}

const RUN = "https://example.test/run/new";

describe("mergeBaselineReport", () => {
  const baseline = [
    ...cell("uniswap / cold compile solc", 17, "https://example.test/run/old"),
    ...cell("uniswap / cold compile slang", 13, "https://example.test/run/old"),
    ...cell("solady / cold compile solc", 30, "https://example.test/run/old"),
  ];

  it("replaces a measured cell's entries together, where they stood", () => {
    const { entries, replaced, added, kept } = mergeBaselineReport(
      baseline,
      [entry("uniswap / cold compile slang", 9)],
      RUN,
    );
    assert.deepEqual(
      entries.map((e) => [e.name, e.value]),
      [
        ["uniswap / cold compile solc", 17],
        ["uniswap / cold compile solc (peak RSS)", 1700],
        ["uniswap / cold compile solc (cpu)", 34],
        ["uniswap / cold compile slang", 9],
        ["solady / cold compile solc", 30],
        ["solady / cold compile solc (peak RSS)", 3000],
        ["solady / cold compile solc (cpu)", 60],
      ],
    );
    assert.deepEqual(
      { replaced, added, kept },
      { replaced: 1, added: 0, kept: 2 },
    );
  });

  it("adds cells the baseline lacks at the end", () => {
    const { entries, added } = mergeBaselineReport(
      baseline,
      cell("uniswap / cold compile forge-1.8.5 solar", 0.8),
      RUN,
    );
    assert.deepEqual(
      entries.slice(-3).map((e) => e.name),
      [
        "uniswap / cold compile forge-1.8.5 solar",
        "uniswap / cold compile forge-1.8.5 solar (peak RSS)",
        "uniswap / cold compile forge-1.8.5 solar (cpu)",
      ],
    );
    assert.equal(added, 1);
  });

  it("records the run on the merged cells' wall entries only", () => {
    const { entries } = mergeBaselineReport(
      baseline,
      cell("solady / cold compile solc", 28),
      RUN,
    );
    const runOf = (name: string) =>
      (
        JSON.parse(entries.find((e) => e.name === name)!.extra) as {
          run?: string;
        }
      ).run;
    assert.equal(runOf("solady / cold compile solc"), RUN);
    assert.equal(runOf("solady / cold compile solc (cpu)"), undefined);
    assert.equal(
      runOf("uniswap / cold compile solc"),
      "https://example.test/run/old",
    );
  });

  it("rejects a wall entry whose extra is not a JSON object", () => {
    assert.throws(
      () =>
        mergeBaselineReport(
          [],
          [{ ...entry("uniswap / cold compile solc", 1), extra: "[]" }],
          RUN,
        ),
      /uniswap \/ cold compile solc: extra is not a JSON object/,
    );
  });
});
