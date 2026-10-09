import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { BenchmarkEntry } from "./helpers/entries.ts";
import { COMMENT_MARKER, renderSlangTables } from "./render-slang-tables.ts";

function wall(name: string, value: number): BenchmarkEntry {
  return {
    name,
    unit: "s",
    value,
    range: "± 0.1",
    extra: JSON.stringify({ times: [value, value, value] }),
  };
}

const entries = [
  wall("aave-v4-solx / cold compile solc", 5),
  wall("aave-v4-solx / cold compile slang", 2.5),
  wall("aave-v4-solx / warm test solc", 190),
  wall("uniswap-v4-core-solx / cold compile solc", 17),
  wall("uniswap-v4-core-solx / cold compile slang", 13),
  wall("uniswap-v4-core-solx / warm test solc", 7.5),
  wall("uniswap-v4-core-solx / warm test slang", 6.5),
];

describe("renderSlangTables", () => {
  const output = renderSlangTables(entries);

  it("starts with the sticky-comment marker", () => {
    assert.ok(output.startsWith(COMMENT_MARKER));
  });

  it("summarises the warm test cells next to the cold compile ones", () => {
    assert.match(output, /### Solidity tests over a warm build/);
    assert.match(output, /\| uniswap-v4-core-solx \| 6\.5 \| 1\.2x \|/);
  });

  it("explains a slang test cell the scenario leaves out", () => {
    assert.match(output, /\| aave-v4-solx \| not run⁵ \|/);
    assert.match(output, /⁵ 149 of aave's 1559 tests/);
  });

  it("compares each cell with slang's cell of the same kind", () => {
    assert.match(output, /\| warm test solc \| 7\.5 \|.*\| 1\.2x \|/);
    assert.match(output, /\| cold compile solc \| 17\.0 \|.*\| 1\.3x \|/);
  });

  it("marks values borrowed from the baseline", () => {
    const quick = renderSlangTables(
      [wall("uniswap-v4-core-solx / cold compile slang", 13)],
      {
        baseline: [wall("uniswap-v4-core-solx / cold compile solc", 17)],
        baselineUrl: "https://example.test/run/1",
      },
    );
    assert.match(quick, /\| uniswap-v4-core-solx \| 13\.0 \| 1\.3x† \|/);
    assert.match(quick, /\| cold compile solc \| 17\.0† \|/);
    assert.match(quick, /† measured in \[the baseline run\]/);
  });
});
