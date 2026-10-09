import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseReport, speedup } from "./slang-report.ts";

function cell(wall: number, wallStddev = 0) {
  return { wall, wallStddev, runs: 5 };
}

describe("speedup", () => {
  it("reports the wall-clock ratio when the gap exceeds the noise", () => {
    assert.equal(speedup(cell(30, 0.5), cell(10, 0.5)), "3.0x");
  });

  it("calls a gap within the two stddevs parity", () => {
    assert.equal(speedup(cell(10.4, 0.3), cell(10, 0.2)), "parity");
  });

  it("does not call a gap just beyond the two stddevs parity", () => {
    assert.equal(speedup(cell(10.6, 0.3), cell(10, 0.2)), "1.1x");
  });

  it("uses the floor for single-run cells, which have no spread", () => {
    assert.equal(speedup(cell(1.05), cell(1)), "parity");
    assert.equal(speedup(cell(1.2), cell(1)), "1.2x");
  });

  it("reports a slowdown as a ratio below one", () => {
    assert.equal(speedup(cell(26.8, 0.2), cell(34, 0.2)), "0.8x");
  });
});

describe("parseReport", () => {
  it("joins the wall, cpu and peak-RSS entries of a cell", () => {
    const { report, unparsed } = parseReport([
      {
        name: "aave-v4-solx / cold compile slang",
        unit: "s",
        value: 3.1,
        range: "± 0.25",
        extra: JSON.stringify({ times: [3, 3.2] }),
      },
      {
        name: "aave-v4-solx / cold compile slang (cpu)",
        unit: "s",
        value: 10.6,
        range: "± 0",
        extra: "{}",
      },
      {
        name: "aave-v4-solx / cold compile slang (peak RSS)",
        unit: "MB",
        value: 285,
        range: "± 0",
        extra: "{}",
      },
      { name: "no separator", unit: "s", value: 1, range: "", extra: "{}" },
    ]);

    assert.deepEqual(report.get("aave-v4-solx")?.get("cold compile slang"), {
      wall: 3.1,
      wallStddev: 0.25,
      runs: 2,
      cpu: 10.6,
      peakRssMb: 285,
    });
    assert.deepEqual(
      unparsed.map((e) => e.name),
      ["no separator"],
    );
  });
});
