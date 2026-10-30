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

// A baseline cell, as merge-baseline-report.ts writes it.
function measuredIn(entry: BenchmarkEntry, run: string): BenchmarkEntry {
  return {
    ...entry,
    extra: JSON.stringify({ ...JSON.parse(entry.extra), run }),
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
    assert.match(output, /\| warm test slang \| not run⁴ \|/);
    assert.match(output, /⁴ 149 of aave's 1559 tests/);
  });

  it("compares each cell with slang's cell of the same kind", () => {
    assert.match(output, /\| warm test solc \| 7\.5 \|.*\| 1\.2x \|/);
    assert.match(output, /\| cold compile solc \| 17\.0 \|.*\| 1\.3x \|/);
  });

  it("marks values borrowed from the baseline", () => {
    const quick = renderSlangTables(
      [wall("uniswap-v4-core-solx / cold compile slang", 13)],
      {
        baseline: [
          measuredIn(
            wall("uniswap-v4-core-solx / cold compile solc", 17),
            "https://example.test/run/1",
          ),
        ],
      },
    );
    assert.match(
      quick,
      /\| Uniswap v4 \| 17\.0s\[†\]\[1\] \| not measured \| 13\.0s \| 1\.3x\[†\]\[1\] \|/,
    );
    assert.match(quick, /\| cold compile solc \| 17\.0\[†\]\[1\] \|/);
    assert.match(quick, /^\[1\]: https:\/\/example\.test\/run\/1$/m);
    assert.match(quick, /each † links the run that measured it/);
  });

  it("adds forge + solar's wall to the compile and test tables", () => {
    const solar = renderSlangTables([
      ...entries,
      wall("uniswap-v4-core-solx / cold compile forge-1.8.5 solar", 0.8),
      wall("uniswap-v4-core-solx / warm test forge-1.8.5 solar", 2),
      wall("openzeppelin-contracts-0.34 / cold compile solc", 50),
      wall("openzeppelin-contracts-0.34 / cold compile slang", 23),
      wall("openzeppelin-contracts-0.34 / cold compile slang parity", 9),
      wall("openzeppelin-contracts-0.34 / cold compile forge-1.8.5 solar", 3.2),
      wall("openzeppelin-contracts-0.34 / warm test forge-1.8.5 solar", 30),
      wall("solady-solx / cold compile slang", 4),
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
    const legacyTests = solar
      .slice(
        solar.indexOf(
          "### slang vs solc in legacy mode (without --via-ir) including Solidity tests",
        ),
      )
      .split("\n### ")[0];
    assert.match(legacyTests, /\| forge solar \|\n/);
    assert.match(legacyTests, /\| Uniswap v4 \|.*\| 2\.8s \|\n/);
    assert.match(
      legacyTests,
      /\| openzeppelin-contracts \(forge-compatible subset\) \|.*\| 33\.2s \|\n/,
    );
    assert.match(legacyTests, /\| Solady \|.*\| 4 tests fail \|\n/);
    assert.match(
      solar,
      /\| warm test forge-1\.8\.5 solar \| ✗ 4 tests fail⁷ \|/,
    );
  });

  it("links every value to the run that measured it", () => {
    const md = renderSlangTables(
      [
        wall("uniswap-v4-core-solx / cold compile slang", 2),
        wall("uniswap-v4-core-solx / cold compile solx-0.1.8", 11),
      ],
      {
        runUrl: "https://example.com/runs/200",
        baseline: [
          measuredIn(
            wall("uniswap-v4-core-solx / cold compile solc via-ir", 75),
            "https://example.com/runs/100",
          ),
        ],
      },
    );
    assert.match(
      md,
      /\| Uniswap v4 \| 75\.0s\[†\]\[100\] \| not measured \| 2\.0s\[‡\]\[200\] \| 37\.5x\[†\]\[100\] \|/,
    );
    assert.match(
      md,
      /\| cold compile solx-0\.1\.8 \| 11\.0\[‡\]\[200\] \|.*\| 5\.5x\[‡\]\[200\] \|/,
    );
    assert.match(md, /^‡ measured in this run: \[200\]\.$/m);
    assert.match(md, /^\[100\]: https:\/\/example\.com\/runs\/100$/m);
    assert.match(md, /^\[200\]: https:\/\/example\.com\/runs\/200$/m);
  });

  it("gives run counts per cell, not per scenario", () => {
    const single = {
      ...wall("lidofinance-core-solx / cold test slang", 104),
      extra: JSON.stringify({ times: [104] }),
    };
    const md = renderSlangTables([
      wall("lidofinance-core-solx / cold compile slang", 40),
      single,
    ]);
    assert.match(md, /^### lidofinance-core-solx\n/m);
    assert.match(md, /\| cold compile slang \| 40\.0 \| — \| — \| 3 \|/);
    assert.match(md, /\| cold test slang \| 104\.0 \| — \| — \| 1 \|/);
  });

  it("says where forge + solar's test column is filled", () => {
    const md = renderSlangTables(entries);
    assert.doesNotMatch(md, /Compile tables only/);
    assert.match(
      md,
      /test column is filled only where the whole Foundry suite passes/,
    );
  });

  it("points lido-vaults' test rows at lido-core", () => {
    const vaults = renderSlangTables([
      wall("lidofinance-vaults-solx / cold compile solc via-ir", 16),
      wall("lidofinance-vaults-solx / cold compile slang", 2),
    ]);
    const tests = vaults.slice(
      vaults.indexOf("### slang vs solc --via-ir including Solidity tests"),
    );
    assert.match(
      tests,
      /\| lido-vaults \| tests measured in lido-core \| tests measured in lido-core \| tests measured in lido-core \|/,
    );
  });

  it("explains lido-core's missing forge + solar cell", () => {
    const lido = renderSlangTables([
      wall("lidofinance-core-solx / cold compile solc via-ir", 60),
      wall("lidofinance-core-solx / cold compile slang", 20),
    ]);
    assert.match(lido, /\| cold compile forge-1\.8\.5 solar \| n\/a⁶ \|/);
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

  it("compares forge cells with slang's forge-scope cell where there is one", () => {
    const oz = renderSlangTables([
      wall("openzeppelin-contracts-0.34 / cold compile slang", 23),
      wall("openzeppelin-contracts-0.34 / cold compile slang parity", 9),
      wall("openzeppelin-contracts-0.34 / cold compile forge-1.7.1", 18),
      wall("openzeppelin-contracts-0.34 / cold compile forge-1.7.1 via-ir", 36),
    ]);
    assert.match(oz, /\| cold compile forge-1\.7\.1 \| 18\.0 \|.*\| 2\.0x \|/);
    assert.match(
      oz,
      /\| cold compile forge-1\.7\.1 via-ir \| 36\.0 \|.*\| 4\.0x \|/,
    );
  });
});
