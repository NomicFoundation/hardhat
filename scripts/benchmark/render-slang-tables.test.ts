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
  wall("uniswap-v4-core-solx / cold compile solx-0.1.8", 15),
  wall("uniswap-v4-core-solx / warm test solc", 7.5),
  wall("uniswap-v4-core-solx / warm test slang", 6.5),
];

describe("renderSlangTables", () => {
  const output = renderSlangTables(entries);

  it("starts with the sticky-comment marker", () => {
    assert.ok(output.startsWith(COMMENT_MARKER));
  });

  it("shows each compiler's wall next to slang's speedup over it", () => {
    assert.match(
      output,
      /\| Uniswap v4 \| 17\.0s \| 15\.0s \| 13\.0s \| 1\.3x \| 1\.2x \| not measured \| - \|/,
    );
  });

  it("adds the warm test cells to cold compile in the tests tables", () => {
    assert.match(
      output,
      /### slang vs solc in legacy mode \(without --via-ir\) including Solidity tests/,
    );
    assert.match(
      output,
      /\| Uniswap v4 \| 24\.5s \| not measured \| 19\.5s \| 1\.3x \|/,
    );
  });

  it("explains a slang test cell the scenario leaves out", () => {
    assert.match(
      output,
      /\| Aave v4 \| [^|]+ \| [^|]+ \| not run \(EIP-712 cheatcodes\) \|/,
    );
    assert.match(output, /\| warm test slang \| not run⁵ \|/);
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
    assert.match(
      quick,
      /\| Uniswap v4 \| 17\.0s† \| not measured \| 13\.0s \| 1\.3x† \|/,
    );
    assert.match(quick, /\| cold compile solc \| 17\.0† \|/);
    assert.match(quick, /† measured in \[the baseline run\]/);
  });

  it("adds forge + solar's wall to the compile tables only", () => {
    const solar = renderSlangTables([
      ...entries,
      wall("uniswap-v4-core-solx / cold compile forge-1.8.5 solar", 0.8),
      wall("openzeppelin-contracts-0.34 / cold compile solc", 50),
      wall("openzeppelin-contracts-0.34 / cold compile slang", 23),
      wall("openzeppelin-contracts-0.34 / cold compile slang parity", 9),
      wall("openzeppelin-contracts-0.34 / cold compile forge-1.8.5 solar", 3.2),
    ]);
    const legacyCompile = solar.slice(
      solar.indexOf(
        "### slang vs solc in legacy mode (without --via-ir) compilation",
      ),
      solar.indexOf("### slang vs solc --via-ir including Solidity tests"),
    );
    assert.match(legacyCompile, /\| forge solar \|\n/);
    assert.match(legacyCompile, /\| Uniswap v4 \|.*\| 0\.8s \|\n/);
    assert.match(
      legacyCompile,
      /\| openzeppelin-contracts \(entire repo\) \|.*\| incompatible \|\n/,
    );
    assert.match(
      legacyCompile,
      /\| openzeppelin-contracts \(forge-compatible subset\) \|.*\| 3\.2s \|\n/,
    );
    const legacyTests = solar.slice(
      solar.indexOf(
        "### slang vs solc in legacy mode (without --via-ir) including Solidity tests",
      ),
    );
    assert.doesNotMatch(legacyTests.split("\n### ")[0], /forge solar/);
  });

  it("explains lido-core's missing forge + solar cell", () => {
    const lido = renderSlangTables([
      wall("lidofinance-core-solx / cold compile solc via-ir", 60),
      wall("lidofinance-core-solx / cold compile slang", 20),
    ]);
    assert.match(lido, /\| cold compile forge-1\.8\.5 solar \| n\/a⁷ \|/);
    assert.match(lido, /\| lido-core \|.*\| n\/a \(0\.4\/0\.6 sources\) \|\n/);
  });

  it("compares a forge-scope cell with slang's forge-scope cell", () => {
    const oz = renderSlangTables([
      wall("openzeppelin-contracts-0.34 / cold compile slang", 23),
      wall("openzeppelin-contracts-0.34 / cold compile slang parity", 9),
      wall(
        "openzeppelin-contracts-0.34 / cold compile solx-0.1.8 parity",
        13.5,
      ),
    ]);
    assert.match(
      oz,
      /\| cold compile solx-0\.1\.8 parity \| 13\.5 \|.*\| 1\.5x \|/,
    );
    assert.match(oz, /\| cold compile slang parity \| 9\.0 \|.*\| {2}\|/);
  });
});
