import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { collectCharts, mergeCharts } from "./mem-series-charts.ts";
import { encodeSeriesTable } from "./mem-series.ts";

const TABLE = {
  tMs: [0, 100, 200],
  byProcess: { hardhat: [100, 120, 110], solc: [0, 50, 40] },
};

function regressionReport(scenario: string): unknown[] {
  return [
    { name: `${scenario} / cold compile`, unit: "s", value: 1, extra: "{}" },
    {
      name: `${scenario} / cold compile (peak RSS)`,
      unit: "MB",
      value: 170,
      extra: "{}",
    },
    {
      name: `${scenario} / cold compile (mem over time)`,
      unit: "MB",
      value: 160,
      extra: JSON.stringify({
        representativeRun: 0,
        ...encodeSeriesTable(TABLE),
        runs: [
          { durationMs: 210, peakRssMb: 170, total: [100, 135, 160, 165, 170] },
        ],
      }),
    },
  ];
}

const BENCH_EXPORT = {
  results: [
    {
      command: "npx hardhat compile",
      memory: [
        { peakRssMb: 170, ...TABLE },
        {
          peakRssMb: 180,
          tMs: [0, 100],
          byProcess: { hardhat: [100, 130], solc: [0, 60] },
        },
        null,
      ],
    },
  ],
};

describe("collectCharts", () => {
  it("extracts mem-over-time entries from a regression report", () => {
    const { format, charts } = collectCharts(regressionReport("my-scenario"));

    assert.equal(format, "regression");
    assert.equal(charts.length, 1);
    assert.equal(charts[0].scenario, "my-scenario");
    assert.equal(charts[0].benchmark, "cold compile");
    assert.deepEqual(
      charts[0].lines.map((l) => [l.label, l.kind]),
      [
        ["hardhat", "process"],
        ["solc", "process"],
        ["total", "total"],
      ],
    );
    // The total is the per-sample sum across processes.
    assert.deepEqual(
      charts[0].lines.find((l) => l.kind === "total")?.mb,
      [100, 170, 150],
    );
    assert.equal(charts[0].runs[0].peakRssMb, 170);
  });

  it("extracts per-run series from a bench export", () => {
    const { format, charts } = collectCharts(BENCH_EXPORT);

    assert.equal(format, "bench-export");
    assert.equal(charts.length, 1);
    assert.equal(charts[0].scenario, undefined);
    assert.equal(charts[0].benchmark, "npx hardhat compile");
    // Representative = median peak (170 over 170,180 resolves to run 0);
    // only its series is drawn — run 2 appears in the stats table alone —
    // and the null run is dropped.
    assert.deepEqual(
      charts[0].lines.map((l) => [l.label, l.kind]),
      [
        ["hardhat", "process"],
        ["solc", "process"],
        ["total", "total"],
      ],
    );
    assert.equal(charts[0].runs.length, 2);
    assert.equal(charts[0].runs[1].durationMs, 100);
    assert.deepEqual(charts[0].runs[0].total, [100, 125, 150, 160, 170]);
  });

  it("skips entries and runs without memory data", () => {
    assert.deepEqual(
      collectCharts([{ name: "x / y", extra: "{}" }]).charts,
      [],
    );
    assert.deepEqual(
      collectCharts({ results: [{ command: "c", memory: [null] }] }).charts,
      [],
    );
  });

  it("skips undecodable mem entries and reports them via onWarn", () => {
    const warnings: string[] = [];
    const { charts } = collectCharts(
      [
        {
          name: "s / cold compile (mem over time)",
          // An older format revision: series stored inline, no seriesGz.
          extra: JSON.stringify({ tMs: [0], byProcess: {}, runs: [] }),
        },
        ...regressionReport("s"),
      ],
      (message) => warnings.push(message),
    );

    assert.equal(charts.length, 1);
    assert.equal(charts[0].benchmark, "cold compile");
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /Skipping "s \/ cold compile \(mem over time\)"/);
  });

  it("throws on an unrecognized report shape", () => {
    assert.throws(() => collectCharts({ foo: 1 }), /Unrecognized report/);
    assert.throws(() => collectCharts("nope"), /Unrecognized report/);
  });
});

describe("mergeCharts", () => {
  it("keeps the per-process breakdown for a single report", () => {
    const charts = mergeCharts([
      { name: "r.json", charts: collectCharts(regressionReport("s")).charts },
    ]);

    assert.equal(charts.length, 1);
    assert.equal(charts[0].title, "s / cold compile");
    assert.equal(charts[0].lines.length, 3);
    assert.equal(charts[0].runTables[0].report, undefined);
  });

  it("collapses a combo found in several reports to per-report totals", () => {
    const charts = mergeCharts([
      {
        name: "before.json",
        charts: collectCharts(regressionReport("s")).charts,
      },
      {
        name: "after.json",
        charts: collectCharts(regressionReport("s")).charts,
      },
    ]);

    assert.equal(charts.length, 1);
    assert.deepEqual(
      charts[0].lines.map((l) => l.label),
      ["before.json", "after.json"],
    );
    assert.deepEqual(
      charts[0].lines.map((l) => l.mb),
      [
        [100, 170, 150],
        [100, 170, 150],
      ],
    );
    assert.deepEqual(
      charts[0].runTables.map((t) => t.report),
      ["before.json", "after.json"],
    );
  });

  it("merges bench exports under the command alone (no scenario)", () => {
    const charts = mergeCharts([
      { name: "before.json", charts: collectCharts(BENCH_EXPORT).charts },
      { name: "after.json", charts: collectCharts(BENCH_EXPORT).charts },
    ]);

    assert.equal(charts.length, 1);
    assert.equal(charts[0].title, "npx hardhat compile");
    assert.deepEqual(
      charts[0].lines.map((l) => l.label),
      ["before.json", "after.json"],
    );
  });

  it("gives a combo found in only one of several reports its own fully-detailed chart, captioned with the source file", () => {
    const charts = mergeCharts([
      { name: "a.json", charts: collectCharts(regressionReport("s1")).charts },
      { name: "b.json", charts: collectCharts(regressionReport("s2")).charts },
    ]);

    assert.equal(charts.length, 2);
    assert.equal(charts[0].title, "s1 / cold compile");
    assert.equal(charts[0].lines.length, 3);
    assert.equal(charts[0].runTables[0].report, "a.json");
    assert.equal(charts[1].runTables[0].report, "b.json");
  });
});
