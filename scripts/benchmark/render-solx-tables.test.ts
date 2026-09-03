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
      upgrade: false,
    });
    assert.deepEqual(parseCell("solc no-opt"), {
      compiler: "solc",
      viaIR: false,
      noOpt: true,
      dwarf: true,
      parity: false,
      upgrade: false,
    });
    assert.deepEqual(parseCell("solx-0.1.8 via-ir no-dwarf"), {
      compiler: "solx-0.1.8",
      viaIR: true,
      noOpt: false,
      dwarf: false,
      parity: false,
      upgrade: false,
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
      upgrade: false,
    });
  });

  it("parses upgrade cells", () => {
    const cell = parseCell("solx-0.1.8 via-ir upgrade");
    assert.equal(cell?.upgrade, true);
    assert.equal(cell?.viaIR, true);
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
    entry("uniswap-v4-core-solx / cold compile solx-0.1.8 via-ir", 12.9, {
      times: [12.8, 13.0],
    }),
    entry("uniswap-v4-core-solx / cold compile solx-0.1.8 via-ir (cpu)", 36.8, {
      user: 36,
      system: 0.8,
    }),
    entry(
      "uniswap-v4-core-solx / cold compile solx-0.1.8 via-ir no-dwarf (cpu)",
      33.4,
      { user: 33, system: 0.4 },
    ),
    entry(
      "uniswap-v4-core-solx / cold compile solx-0.1.8 via-ir (peak RSS)",
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
    entry("lidofinance-core-solx / cold compile solc via-ir", 21.3, {
      times: [21.2, 21.4],
    }),
    entry("lidofinance-core-solx / cold compile solc via-ir (cpu)", 22.0, {
      user: 21.5,
      system: 0.5,
    }),
    entry("lidofinance-core-solx / cold compile solx-0.1.8 via-ir", 9.4, {
      times: [9.3, 9.5],
    }),
    entry(
      "lidofinance-core-solx / cold compile solx-0.1.8 via-ir (cpu)",
      25.1,
      {
        user: 24.6,
        system: 0.5,
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
    entry("uniswap-v4-core-solx / warm test solc via-ir", 30.0, {
      times: [29.9, 30.1],
    }),
    entry("uniswap-v4-core-solx / warm test solc via-ir (cpu)", 31.0, {
      user: 30.5,
      system: 0.5,
    }),
    entry("uniswap-v4-core-solx / warm test solx-0.1.8 via-ir", 25.0, {
      times: [24.9, 25.1],
    }),
    entry("uniswap-v4-core-solx / warm test forge-1.7.1 via-ir", 22.0, {
      times: [21.9, 22.1],
    }),
    entry(
      "uniswap-v4-core-solx / warm test solx-0.1.8 via-ir (peak RSS)",
      1234,
      {},
      "MB",
    ),
    entry("openzeppelin-contracts-0.34 / warm test solc via-ir", 80.0, {
      times: [79.9, 80.1],
    }),
    entry("1inch-swap-vm-solx / cold compile solc via-ir", 267.9, {
      times: [267.5, 268.3],
    }),
    entry("uniswap-v4-core-solx / warm compile solc", 2.1, {
      times: [2.0, 2.2],
    }),
    entry("uniswap-v4-core-solx / warm compile solc (cpu)", 2.5, {
      user: 2.3,
      system: 0.2,
    }),
    entry("uniswap-v4-core-solx / warm compile solx-0.1.8", 2.2, {
      times: [2.1, 2.3],
    }),
    entry("uniswap-v4-core-solx / warm compile forge-1.7.1 via-ir", 0.1, {
      times: [0.1, 0.1],
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
      /\| cold compile \| solc 0\.8\.34 \| solx 0\.1\.6 \(shipped\) \| solx 0\.1\.8 \|/,
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

  it("annotates lido's IR-only legacy rows for both compilers", () => {
    // The scenario benchmarks via-IR cells only; the legacy and no-opt rows
    // exist purely as annotated FAILs (the vaults tree is IR-only).
    assert.match(
      md,
      /### lidofinance-core-solx[\s\S]*?\| legacy \| ✗ does not compile¹ \| ✗ does not compile¹ \|/,
    );
    assert.match(
      md,
      /### lidofinance-core-solx[\s\S]*?\| legacy, no optimizer \| ✗ does not compile¹ \| — \|/,
    );
    assert.match(
      md,
      /### lidofinance-core-solx[\s\S]*?\| via-IR \| 21\.3 \/ 22\.0 \| 9\.4 \/ 25\.1 \|/,
    );
  });

  it("keeps a column for a compiler that produced nothing at all", () => {
    // 1inch-swap-vm has no solx cell: solx cannot compile the sources and the
    // repo is via-IR only. The column must still appear, carrying the note.
    const swapVm = renderSolxTables([
      entry("1inch-swap-vm-solx / cold compile solc via-ir", 267.9, {
        times: [267.5, 268.3],
      }),
      entry("1inch-swap-vm-solx / cold compile solc via-ir (cpu)", 269.4, {
        user: 269,
        system: 0.4,
      }),
    ]);

    assert.match(swapVm, /\| cold compile \| solc 0\.8\.34 \| solx 0\.1\.8 \|/);
    assert.match(
      swapVm,
      /\| via-IR \| 267\.9 \/ 269\.4 \| ✗ does not compile³ \|/,
    );
    // The legacy row stays out: neither compiler has a cell or a note there.
    assert.doesNotMatch(swapVm, /\| legacy \|/);
  });

  it("gives every footnote a distinct marker", () => {
    // A static footnote once collided with the conditional parity one, so the
    // report showed two different notes under the same superscript.
    const markers = [...md.matchAll(/^([¹²³⁴⁵⁶⁷⁸⁹])\s/gmu)].map((m) => m[1]);

    assert.deepEqual(markers, [...new Set(markers)]);
  });

  it("renders the warm-test table with marks and skips empty pipelines", () => {
    assert.match(
      md,
      /### Warm test suite[\s\S]*?\| scenario \| pipeline \| hardhat \+ solc 0\.8\.34 \| hardhat \+ solx 0\.1\.8 \| forge 1\.7\.1 \+ solc 0\.8\.34 \|/,
    );
    assert.match(
      md,
      /\| uniswap-v4-core-solx \| via-IR \| 30\.0 \/ 31\.0 \| 25\.0 \/ — \| 22\.0 \/ — \|/,
    );
    // OZ skips one upstream-buggy test on every toolchain: number + caveat mark.
    assert.match(
      md,
      /\| openzeppelin-contracts-0\.34 \| via-IR \| 80\.0 \/ —⁶ \| — \| — \|/,
    );
    assert.match(md, /⁶ OZ runs 346 of its 347 tests on all three toolchains/);
    // No legacy warm cells in the fixture: no legacy row in the warm table.
    assert.doesNotMatch(
      md,
      /### Warm test suite[\s\S]*?\| [^\n|]+ \| legacy \|/,
    );
    // The warm cells' peak RSS lands in the RSS table, prefixed.
    assert.match(md, /warm test solx-0\.1\.8 via-ir \| 1234 \|/);
  });

  it("renders the warm-compile table, one pipeline-independent row per scenario", () => {
    assert.match(
      md,
      /### Warm compile[\s\S]*?\| uniswap-v4-core-solx \| 2\.1 \/ 2\.5 \| 2\.2 \/ — \| 0\.1 \/ — \|/,
    );
    // OZ measured no warm-compile cells in this fixture: no row.
    assert.doesNotMatch(
      md,
      /### Warm compile[\s\S]{0,600}openzeppelin-contracts-0\.34/,
    );
  });

  it("renders the cold-test table with aave's solc via-IR FAIL note", () => {
    const aave = renderSolxTables([
      entry("aave-v4-solx / cold test solx-0.1.8 via-ir", 320.0, {
        times: [320.0],
      }),
      entry("aave-v4-solx / cold test solc", 450.0, { times: [450.0] }),
      entry("aave-v4-solx / cold test forge-1.7.1", 380.0, { times: [380.0] }),
    ]);
    assert.match(
      aave,
      /### Cold test suite[\s\S]*?\| aave-v4-solx \| legacy \| 450\.0 \/ — \| — \| 380\.0 \/ — \|/,
    );
    assert.match(
      aave,
      /### Cold test suite[\s\S]*?\| aave-v4-solx \| via-IR \| ✗ does not compile⁵ \| 320\.0 \/ — \| — \|/,
    );
    assert.match(aave, /⁵ solc via-IR cannot compile aave's Foundry test/);
    // A report with no cold-test cells must not grow the table at all.
    assert.doesNotMatch(md, /Cold test suite/);
  });

  it("annotates aave's via-IR solc test FAIL and only when warm cells exist", () => {
    const aave = renderSolxTables([
      entry("aave-v4-solx / warm test solx-0.1.8 via-ir", 200.0, {
        times: [200.0],
      }),
    ]);
    assert.match(
      aave,
      /\| aave-v4-solx \| via-IR \| ✗ does not compile⁵ \| 200\.0 \/ — \| — \|/,
    );
    assert.match(aave, /⁵ solc via-IR cannot compile aave's Foundry test/);

    // An old report without warm cells must not grow a note-only warm table.
    const old = renderSolxTables([
      entry("aave-v4-solx / cold compile solc via-ir", 14.0, {
        times: [13.9, 14.1],
      }),
    ]);
    assert.doesNotMatch(old, /Warm test suite/);
    assert.doesNotMatch(old, /does not compile⁵/);
  });

  it("gives swap-vm a visible cannot-run-tests row instead of dropping it", () => {
    // Note-only rows render whenever the table has real measurements…
    assert.match(
      md,
      /### Warm test suite[\s\S]*?\| 1inch-swap-vm-solx \| via-IR \| ✗ tests do not compile⁸ \| ✗ tests do not compile⁸ \| — \|/,
    );
    assert.match(md, /⁸ swap-vm's Foundry test sources fail to compile/);
    // …but a report with no test measurements at all renders no table and
    // no stray footnotes.
    const old = renderSolxTables([
      entry("uniswap-v4-core-solx / cold compile solc", 19.6, {
        times: [19.5, 19.7],
      }),
    ]);
    assert.doesNotMatch(old, /Warm test suite/);
    assert.doesNotMatch(old, /⁸ swap-vm/);
  });

  it("marks solady's removed-from-discovery test on every warm cell", () => {
    const solady = renderSolxTables([
      entry("solady-solx / warm test solc", 60.0, { times: [60.0] }),
      entry("solady-solx / warm test solx-0.1.8 via-ir", 55.0, {
        times: [55.0],
      }),
      entry("solady-solx / warm test forge-1.7.1", 50.0, { times: [50.0] }),
    ]);
    assert.match(
      solady,
      /\| solady-solx \| legacy \| 60\.0 \/ —⁷ \| — \| 50\.0 \/ —⁷ \|/,
    );
    assert.match(
      solady,
      /\| solady-solx \| via-IR \| — \| 55\.0 \/ —⁷ \| — \|/,
    );
    assert.match(solady, /⁷ solady runs 2040 of its 2041 tests/);
  });

  it("renders RSS, replay and leftovers", () => {
    assert.match(md, /solx-0\.1\.8 via-ir \| 812 \|/);
    assert.match(md, /raw replay/i);
    assert.match(md, /something \/ unrecognized entry \| 1\.23 \| s \|/);
  });

  it("ignores retired no-dwarf entries from old reports", () => {
    // The fixture still carries one no-dwarf entry; it must neither crash
    // parsing nor surface anywhere (the DWARF-cost table is retired).
    assert.doesNotMatch(md, /no-dwarf/);
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
      /\| scenario \| pipeline \| hardhat \+ solc 0\.8\.34 \| hardhat \+ solx 0\.1\.8 \| forge 1\.7\.1 \+ solc 0\.8\.34 \|/,
    );
    assert.match(
      md,
      /\| openzeppelin-contracts-0\.34 \| legacy \| 40\.0 \/ 42\.0⁹ \| — \| 14\.6 \/ 16\.3 \|/,
    );
    // Dedicated parity cells are a smaller source set than the matrix: marked.
    assert.match(
      md,
      /⁹ dedicated parity cell: hardhat measured on forge's source set/,
    );
    // The version-pinned cell fills the solx column (shipped cells retired).
    assert.match(
      md,
      /\| uniswap-v4-core-solx \| via-IR \| 77\.4 \/ 78\.5⁴ \| 12\.9 \/ 36\.8⁴ \| 10\.4 \/ 30\.2 \|/,
    );
    assert.match(md, /⁴ same-scope matrix cell/);
    assert.doesNotMatch(md, /\| cold compile \|[^\n]*forge/);
    assert.doesNotMatch(md, /\| cold compile \|[^\n]*parity/);
  });

  it("prefers exact shipped-solx parity cells from old reports", () => {
    const old = renderSolxTables(
      [
        entry("legacy-scenario / cold compile solx via-ir", 20.0, {
          times: [19.9, 20.1],
        }),
        entry("legacy-scenario / cold compile solx via-ir (cpu)", 50.0, {
          user: 49,
          system: 1,
        }),
        entry("legacy-scenario / cold compile solx-0.1.8 via-ir", 12.0, {
          times: [11.9, 12.1],
        }),
        entry("legacy-scenario / cold compile forge-1.7.1 via-ir", 10.0, {
          times: [9.9, 10.1],
        }),
      ],
      {},
    );
    assert.match(old, /hardhat \+ solx \(shipped\)/);
    assert.match(
      old,
      /\| legacy-scenario \| via-IR \| — \| 20\.0 \/ 50\.0⁴ \|/,
    );
  });

  it("renders upgrade-tree cells as their own pivot row", () => {
    const vaults = renderSolxTables(
      [
        entry("lidofinance-vaults-solx / cold compile solc via-ir", 16.5, {
          times: [16.4, 16.6],
        }),
        entry("lidofinance-vaults-solx / cold compile solx-0.1.8 via-ir", 4.7, {
          times: [4.6, 4.8],
        }),
        entry(
          "lidofinance-vaults-solx / cold compile solx-0.1.8 via-ir upgrade",
          11.0,
          { times: [10.9, 11.1] },
        ),
        entry(
          "lidofinance-vaults-solx / cold compile forge-1.7.1 via-ir",
          14.0,
          { times: [13.9, 14.1] },
        ),
      ],
      {},
    );
    // solx builds the upgrade tree at 0.8.34; solc's FAIL is the datum.
    assert.match(
      vaults,
      /\| via-IR, upgrade tree \| ✗ does not compile² \| 11\.0 \/ — \|/,
    );
    assert.match(vaults, /² lido's contracts\/upgrade/);
    // The matrix and parity cells stay on the matrix sources: the upgrade
    // cell must not leak into either.
    assert.match(vaults, /\| via-IR \| 16\.5 \/ — \| 4\.7 \/ — \|/);
    assert.match(
      vaults,
      /\| lidofinance-vaults-solx \| via-IR \| 16\.5 \/ —⁴ \| 4\.7 \/ —⁴ \| 14\.0 \/ — \|/,
    );
  });

  it("warns on non-success status", () => {
    const partial = renderSolxTables(report, { status: "failure" });
    assert.match(partial, /results may be partial/);
    assert.doesNotMatch(md, /results may be partial/);
  });
});
