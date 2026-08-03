import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseCell,
  renderSolxTables,
  COMMENT_MARKER,
} from "./render-solx-tables.ts";
import type { BenchmarkEntry } from "./helpers/stats.ts";

function entry(
  name: string,
  value: number,
  extra: object = {},
  unit = "s",
): BenchmarkEntry {
  return { name, value, unit, range: "± 0", extra: JSON.stringify(extra) };
}

describe("parseCell", () => {
  it("parses matrix cells", () => {
    assert.deepEqual(parseCell("solc"), {
      compiler: "solc",
      viaIR: false,
      noOpt: false,
      dwarf: true,
      parity: false,
    });
    assert.deepEqual(parseCell("solc no-opt"), {
      compiler: "solc",
      viaIR: false,
      noOpt: true,
      dwarf: true,
      parity: false,
    });
    assert.deepEqual(parseCell("solx-0.1.7 via-ir no-dwarf"), {
      compiler: "solx-0.1.7",
      viaIR: true,
      noOpt: false,
      dwarf: false,
      parity: false,
    });
  });

  it("parses parity and forge cells", () => {
    assert.equal(parseCell("solc parity")!.parity, true);
    // forge cells are parity-scoped by construction, not by token
    assert.deepEqual(parseCell("forge-1.7.1 via-ir"), {
      compiler: "forge-1.7.1",
      viaIR: true,
      noOpt: false,
      dwarf: true,
      parity: false,
    });
  });

  it("rejects non-cells", () => {
    assert.equal(parseCell("warm compile"), undefined);
    assert.equal(parseCell("solx sometimes"), undefined);
  });
});

describe("renderSolxTables", () => {
  const report: BenchmarkEntry[] = [
    entry("uniswap-v4-core-solx / cold compile solc", 19.6, {
      times: [19.5, 19.7],
    }),
    entry("uniswap-v4-core-solx / cold compile solc (cpu)", 20.6, {
      user: 20,
      system: 0.6,
    }),
    entry("uniswap-v4-core-solx / cold compile solc no-opt", 9.1, {
      times: [9.0, 9.2],
    }),
    entry("uniswap-v4-core-solx / cold compile solc no-opt (cpu)", 9.9, {
      user: 9,
      system: 0.9,
    }),
    entry("uniswap-v4-core-solx / cold compile solx", 16.1, {
      times: [16.0, 16.2],
    }),
    entry("uniswap-v4-core-solx / cold compile solx (cpu)", 44.0, {
      user: 43,
      system: 1,
    }),
    entry("uniswap-v4-core-solx / cold compile solx-0.1.7 via-ir", 12.9, {
      times: [12.8, 13.0],
    }),
    entry("uniswap-v4-core-solx / cold compile solx-0.1.7 via-ir (cpu)", 36.8, {
      user: 36,
      system: 0.8,
    }),
    entry(
      "uniswap-v4-core-solx / cold compile solx-0.1.7 via-ir no-dwarf (cpu)",
      33.4,
      { user: 33, system: 0.4 },
    ),
    entry(
      "uniswap-v4-core-solx / cold compile solx-0.1.7 via-ir (peak RSS)",
      812,
      {},
      "MB",
    ),
    entry("uniswap-v4-core-solx / raw replay solx (cpu)", 30.1, {
      user: 30,
      system: 0.1,
    }),
    entry("uniswap-v4-core-solx / cold compile solc via-ir", 77.4, {
      times: [77.0, 77.8],
    }),
    entry("uniswap-v4-core-solx / cold compile solc via-ir (cpu)", 78.5, {
      user: 78,
      system: 0.5,
    }),
    entry("uniswap-v4-core-solx / cold compile forge-1.7.1 via-ir", 10.4, {
      times: [10.3, 10.5],
    }),
    entry(
      "uniswap-v4-core-solx / cold compile forge-1.7.1 via-ir (cpu)",
      30.2,
      {
        user: 30,
        system: 0.2,
      },
    ),
    entry("openzeppelin-contracts-0.34 / cold compile solc parity", 40.0, {
      times: [39.8, 40.1, 40.1],
    }),
    entry(
      "openzeppelin-contracts-0.34 / cold compile solc parity (cpu)",
      42.0,
      {
        user: 41,
        system: 1,
      },
    ),
    entry("openzeppelin-contracts-0.34 / cold compile forge-1.7.1", 14.6, {
      times: [14.5, 14.7, 14.6],
    }),
    entry(
      "openzeppelin-contracts-0.34 / cold compile forge-1.7.1 (cpu)",
      16.3,
      {
        user: 15.6,
        system: 0.7,
      },
    ),
    entry("openzeppelin-contracts-0.34 / cold compile solc", 59.4, {
      times: [59, 59.8, 59.4],
    }),
    entry("openzeppelin-contracts-0.34 / cold compile solc (cpu)", 62.5, {
      user: 62,
      system: 0.5,
    }),
    entry("solady-solx / cold compile solc", 55.2, {
      times: [55.0, 55.4],
    }),
    entry("solady-solx / cold compile solc (cpu)", 42.4, {
      user: 39,
      system: 3.4,
    }),
    entry("something / unrecognized entry", 1.23),
  ];
  const md = renderSolxTables(report, {
    shippedVersion: "0.1.6",
    runUrl: "https://example.test/run/1",
    headSha: "abcdef0123456789",
  });

  it("pivots wall / cpu per compiler column", () => {
    assert.match(md, /\| legacy \| 19\.6 \/ 20\.6 \| 16\.1 \/ 44\.0 \| — \|/);
    assert.match(md, /\| via-IR \| 77\.4 \/ 78\.5 \| — \| 12\.9 \/ 36\.8 \|/);
    assert.match(md, /\| legacy, no optimizer \| 9\.1 \/ 9\.9 \| — \| — \|/);
    assert.match(
      md,
      /\| cold compile \| solc 0\.8\.34 \| solx 0\.1\.6 \(shipped\) \| solx 0\.1\.7 \|/,
    );
  });

  it("annotates OZ's no-opt FAIL instead of leaving a hole", () => {
    assert.match(md, /\| legacy, no optimizer \| ✗ does not compile¹ \|/);
    assert.match(md, /stack-too-deep/);
  });

  it("annotates solady's no-opt FAIL the same way", () => {
    assert.match(
      md,
      /### solady-solx[\s\S]*?\| legacy, no optimizer \| ✗ does not compile¹ \|/,
    );
  });

  it("renders DWARF cost, RSS, replay and leftovers", () => {
    assert.match(md, /solx-0\.1\.7 via-ir \| \+3\.4 \| 33\.4 → 36\.8/);
    assert.match(md, /solx-0\.1\.7 via-ir \| 812 \|/);
    assert.match(md, /raw replay/i);
    assert.match(md, /something \/ unrecognized entry \| 1\.23 \| s \|/);
  });

  it("embeds the sticky marker, provenance and run counts", () => {
    assert.ok(md.startsWith(COMMENT_MARKER));
    assert.match(
      md,
      /\[this run\]\(https:\/\/example\.test\/run\/1\) at abcdef012\./,
    );
    assert.match(md, /uniswap-v4-core-solx <sub>\(2 runs\/cell\)<\/sub>/);
    assert.match(
      md,
      /solx 0\.1\.6 \(shipped\)/,
      "shipped column heading uses the map version",
    );
  });

  it("renders the cross-tool parity table, forge out of the pivot", () => {
    assert.match(
      md,
      /\| scenario \| pipeline \| hardhat \+ solc 0\.8\.34 \| hardhat \+ solx \(shipped\) \| forge 1\.7\.1 \+ solc 0\.8\.34 \|/,
    );
    assert.match(
      md,
      /\| openzeppelin-contracts-0\.34 \| legacy \| 40\.0 \/ 42\.0 \| — \| 14\.6 \/ 16\.3 \|/,
    );
    assert.match(
      md,
      /\| uniswap-v4-core-solx \| via-IR \| 77\.4 \/ 78\.5² \| — \| 10\.4 \/ 30\.2 \|/,
    );
    assert.match(md, /² same-scope matrix cell/);
    assert.doesNotMatch(md, /\| cold compile \|[^\n]*forge/);
    assert.doesNotMatch(md, /\| cold compile \|[^\n]*parity/);
  });

  it("warns on non-success status", () => {
    const partial = renderSolxTables(report, { status: "failure" });
    assert.match(partial, /results may be partial/);
    assert.doesNotMatch(md, /results may be partial/);
  });
});
