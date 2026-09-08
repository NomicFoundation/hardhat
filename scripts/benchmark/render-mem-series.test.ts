import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assignLabels } from "./render-mem-series.ts";
import type { ChartLine, MemChart } from "./helpers/mem-series-charts.ts";

function chart(lines: ChartLine[]): MemChart {
  return { title: "t", lines, runTables: [] };
}

function processLine(label: string, peakMb: number): ChartLine {
  return { label, tMs: [0, 100], mb: [0, peakMb], kind: "process" };
}

const TOTAL: ChartLine = { label: "total", tMs: [0], mb: [1], kind: "total" };

describe("assignLabels", () => {
  it("ranks process labels by their peak anywhere", () => {
    const charts = [
      chart([processLine("small", 10), processLine("big", 500), TOTAL]),
      chart([processLine("medium", 100), TOTAL]),
    ];

    assert.deepEqual(assignLabels(charts), ["big", "medium", "small"]);
  });

  it("gives report labels slots before process labels", () => {
    const charts = [
      chart([
        { label: "before.json", tMs: [0], mb: [1], kind: "report" },
        { label: "after.json", tMs: [0], mb: [1], kind: "report" },
      ]),
      chart([processLine("huge", 9000), TOTAL]),
    ];

    assert.deepEqual(assignLabels(charts), [
      "before.json",
      "after.json",
      "huge",
    ]);
  });

  it("folds process labels beyond the 24 hue+style slots into 'other'", () => {
    // 30 labels across two charts; the 6 globally smallest must fold.
    const labels = Array.from({ length: 30 }, (_, i) => `p${i}`);
    const charts = [
      chart([
        ...labels.slice(0, 20).map((l, i) => processLine(l, 900 - i)),
        TOTAL,
      ]),
      chart([
        ...labels.slice(20).map((l, i) => processLine(l, 100 - i)),
        TOTAL,
      ]),
    ];

    const assigned = assignLabels(charts);

    assert.equal(assigned.length, 24);
    assert.deepEqual(assigned, labels.slice(0, 24));
    // First chart is untouched (all its labels kept); the second folds its
    // smallest six into one "other" line placed before the total.
    assert.equal(charts[0].lines.length, 21);
    assert.deepEqual(
      charts[1].lines.map((l) => l.label),
      [...labels.slice(20, 24), "other", "total"],
    );
    const other = charts[1].lines.find((l) => l.label === "other");
    // p24..p29 peak at 96..91 -> the folded sum at the last sample.
    assert.deepEqual(other?.mb, [0, 96 + 95 + 94 + 93 + 92 + 91]);
  });
});
