import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { BenchmarkEntry } from "./helpers/entries.ts";
import { renderSlangBlogTables } from "./render-slang-blog-tables.ts";

function wall(name: string, value: number): BenchmarkEntry {
  return {
    name,
    unit: "s",
    value,
    range: "± 0.1",
    extra: JSON.stringify({ times: [value, value, value] }),
  };
}

function section(output: string, title: string): string {
  const start = output.indexOf(`### ${title}\n`);
  assert.notEqual(start, -1, `no "${title}" section`);
  const end = output.indexOf("\n### ", start + 1);
  return output.slice(start, end === -1 ? undefined : end);
}

const VIA_IR = "slang vs solc --via-ir compilation";
const LEGACY = "slang vs solc in legacy mode (without --via-ir) compilation";

describe("renderSlangBlogTables", () => {
  const entries = [
    wall("openzeppelin-contracts-0.34 / cold compile solc via-ir", 150),
    wall("openzeppelin-contracts-0.34 / cold compile slang", 30),
    wall("openzeppelin-contracts-0.34 / cold compile solc via-ir parity", 50),
    wall("openzeppelin-contracts-0.34 / cold compile slang parity", 10),
    wall("openzeppelin-contracts-0.34 / cold compile forge-1.7.1 via-ir", 40),
    wall("uniswap-v4-core-solx / cold compile solc via-ir", 80),
    wall("uniswap-v4-core-solx / cold compile slang", 10),
    wall("uniswap-v4-core-solx / cold compile solc", 20),
    wall("lidofinance-vaults-solx / cold compile solc via-ir", 18),
    wall("lidofinance-vaults-solx / cold compile slang", 6),
  ];
  const output = renderSlangBlogTables(entries);

  it("sums OpenZeppelin once, as the entire repo, in the headline", () => {
    assert.match(
      section(output, VIA_IR),
      /all 3 repos .* solc 248s in total, and it takes slang 46s\. \*\*A 5\.4x/,
    );
  });

  it("sorts rows by the speedup over Hardhat solc", () => {
    const repos = [...section(output, VIA_IR).matchAll(/^\| ([^|]+?) \|/gm)]
      .map((m) => m[1])
      .filter((r) => r !== "Repo" && r !== "---");
    assert.deepEqual(repos, [
      "Uniswap v4",
      "openzeppelin-contracts (entire repo)",
      "openzeppelin-contracts (forge-compatible subset)",
      "lido-vaults",
    ]);
  });

  it("compares the forge-compatible subset against forge, the entire repo not", () => {
    const table = section(output, VIA_IR);
    assert.match(
      table,
      /\| openzeppelin-contracts \(entire repo\) \|.*\| incompatible \| - \|/,
    );
    assert.match(
      table,
      /\| openzeppelin-contracts \(forge-compatible subset\) \| 50\.0s \| 10\.0s \| 5\.0x \| 40\.0s \| 4\.0x \|/,
    );
  });

  it("leaves via-IR-only repos out of the legacy table", () => {
    assert.doesNotMatch(section(output, LEGACY), /lido-vaults/);
  });

  it("says why a test table is empty", () => {
    assert.match(
      section(output, "slang vs solc --via-ir including Solidity tests"),
      /No repo has both a solc and a slang number/,
    );
  });

  it("adds warm test to cold compile, or takes a measured cold test", () => {
    const tested = renderSlangBlogTables([
      ...entries,
      wall("uniswap-v4-core-solx / warm test solc via-ir", 5),
      wall("uniswap-v4-core-solx / warm test slang", 6),
      wall("lidofinance-vaults-solx / cold test solc via-ir", 30),
      wall("lidofinance-vaults-solx / cold test slang", 9),
    ]);
    const table = section(
      tested,
      "slang vs solc --via-ir including Solidity tests",
    );
    assert.match(table, /\| Uniswap v4 \| 85\.0s \| 16\.0s \|/);
    assert.match(table, /\| lido-vaults \| 30\.0s \| 9\.0s \|/);
  });
});
