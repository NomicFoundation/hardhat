import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { gunzipSync } from "node:zlib";
import {
  decodeSeriesTable,
  deltaDecode,
  deltaEncode,
  encodeSeriesTable,
  fiveNumberSummary,
  pickRepresentativeRun,
  processLabel,
  toSeriesTable,
  treeTotalMb,
  type MemorySample,
} from "./mem-series.ts";

describe("processLabel", () => {
  it("labels a plain binary by its basename", () => {
    assert.equal(
      processLabel(["/usr/bin/solc", "--standard-json"], "solc"),
      "solc",
    );
    assert.equal(processLabel(["bash", "-c", "sleep 1"], "bash"), "bash");
  });

  it("labels a node process by its script's basename", () => {
    assert.equal(
      processLabel(
        ["/usr/bin/node", "/repo/node_modules/.bin/hardhat", "compile"],
        "node",
      ),
      "hardhat",
    );
    assert.equal(
      processLabel(["node", "/x/dist/solcjs-runner.js", "input.json"], "node"),
      "solcjs-runner.js",
    );
  });

  it("skips node flags when finding the script", () => {
    assert.equal(
      processLabel(
        ["node", "--max-old-space-size=4096", "/a/b/npx", "hardhat"],
        "node",
      ),
      "npx",
    );
  });

  it("labels a node process without a script argument as node", () => {
    assert.equal(processLabel(["node", "--version"], "node"), "node");
  });

  it("resolves a generic script basename to its npm package", () => {
    assert.equal(
      processLabel(
        ["node", "/repo/node_modules/hardhat/dist/src/internal/cli/cli.js"],
        "node",
      ),
      "hardhat",
    );
    assert.equal(
      processLabel(
        ["node", "/repo/node_modules/@scope/tool/dist/index.js"],
        "node",
      ),
      "@scope/tool",
    );
  });

  it("resolves the package through a .bin shim's relative path", () => {
    assert.equal(
      processLabel(
        [
          "node",
          "/x/node_modules/.bin/../hardhat/dist/src/internal/cli/cli.js",
        ],
        "node",
      ),
      "hardhat",
    );
  });

  it("keeps a generic script basename outside node_modules", () => {
    assert.equal(
      processLabel(["node", "/repo/tools/cli.js"], "node"),
      "cli.js",
    );
  });

  it("falls back to the kernel name for an empty argv (zombies)", () => {
    assert.equal(processLabel([], "solc"), "solc");
  });
});

describe("fiveNumberSummary", () => {
  it("returns the value five times for a single sample", () => {
    assert.deepEqual(fiveNumberSummary([7]), [7, 7, 7, 7, 7]);
  });

  it("computes quartiles with linear interpolation", () => {
    // sorted: 1,2,3,4 → p25 at pos 0.75 → 1.75, p50 → 2.5, p75 → 3.25
    assert.deepEqual(fiveNumberSummary([4, 1, 3, 2]), [1, 1.75, 2.5, 3.25, 4]);
  });

  it("returns exact order statistics for aligned positions", () => {
    assert.deepEqual(
      fiveNumberSummary([10, 20, 30, 40, 50]),
      [10, 20, 30, 40, 50],
    );
  });

  it("throws on an empty sample set", () => {
    assert.throws(() => fiveNumberSummary([]));
  });
});

describe("pickRepresentativeRun", () => {
  it("picks the single run when there is only one", () => {
    assert.equal(pickRepresentativeRun([512]), 0);
  });

  it("picks the run with the median peak", () => {
    assert.equal(pickRepresentativeRun([700, 500, 600]), 2);
  });

  it("resolves an even count to the lower-middle peak's run", () => {
    // sorted peaks: 400 (run 3), 500 (run 1), 600 (run 0), 700 (run 2)
    assert.equal(pickRepresentativeRun([600, 500, 700, 400]), 1);
  });

  it("resolves ties to the earlier run", () => {
    assert.equal(pickRepresentativeRun([500, 500, 500]), 1);
    assert.equal(pickRepresentativeRun([500, 500]), 0);
  });

  it("throws on an empty run set", () => {
    assert.throws(() => pickRepresentativeRun([]));
  });
});

describe("toSeriesTable", () => {
  const sample = (
    tMs: number,
    entries: Array<[string, number]>,
  ): MemorySample => ({
    tMs,
    byLabel: new Map(entries),
  });

  it("pivots samples into a shared time axis and per-label series", () => {
    const table = toSeriesTable([
      sample(0.4, [["hardhat", 298.6]]),
      sample(100.2, [
        ["hardhat", 310.2],
        ["solc", 512.4],
      ]),
      sample(200.7, [["hardhat", 305.1]]),
    ]);

    assert.deepEqual(table.tMs, [0, 100, 201]);
    assert.deepEqual(table.byProcess, {
      hardhat: [299, 310, 305],
      solc: [0, 512, 0],
    });
  });

  it("returns empty tables for no samples", () => {
    assert.deepEqual(toSeriesTable([]), { tMs: [], byProcess: {} });
  });
});

describe("deltaEncode / deltaDecode", () => {
  it("encodes consecutive differences and decodes them back", () => {
    const values = [100, 201, 301, 405, 400];
    assert.deepEqual(deltaEncode(values), [100, 101, 100, 104, -5]);
    assert.deepEqual(deltaDecode(deltaEncode(values)), values);
  });

  it("handles empty and single-element arrays", () => {
    assert.deepEqual(deltaEncode([]), []);
    assert.deepEqual(deltaDecode([]), []);
    assert.deepEqual(deltaDecode(deltaEncode([7])), [7]);
  });
});

describe("encodeSeriesTable", () => {
  it("compresses a long series into seriesGz and round-trips", () => {
    const table = {
      tMs: Array.from({ length: 500 }, (_, i) => i * 100 + (i % 3)),
      byProcess: {
        hardhat: Array.from({ length: 500 }, (_, i) => 300 + (i % 40)),
        solc: Array.from({ length: 500 }, (_, i) => (i > 100 ? 512 : 0)),
      },
    };

    const encoded = encodeSeriesTable(table);
    assert.ok("seriesGz" in encoded);
    assert.ok(encoded.seriesGz.length < JSON.stringify(table).length);

    const decoded = JSON.parse(
      gunzipSync(Buffer.from(encoded.seriesGz, "base64")).toString("utf-8"),
    );
    assert.deepEqual(deltaDecode(decoded.tMs), table.tMs);
    assert.deepEqual(
      deltaDecode(decoded.byProcess.hardhat),
      table.byProcess.hardhat,
    );
    assert.deepEqual(deltaDecode(decoded.byProcess.solc), table.byProcess.solc);
  });

  it("keeps a tiny series raw when compression would not help", () => {
    const table = { tMs: [0, 100], byProcess: { hardhat: [10, 11] } };
    assert.deepEqual(encodeSeriesTable(table), { series: table });
  });
});

describe("decodeSeriesTable", () => {
  it("round-trips a compressed table through encodeSeriesTable", () => {
    const table = {
      tMs: Array.from({ length: 500 }, (_, i) => i * 100 + (i % 3)),
      byProcess: {
        hardhat: Array.from({ length: 500 }, (_, i) => 300 + (i % 40)),
        solc: Array.from({ length: 500 }, (_, i) => (i > 100 ? 512 : 0)),
      },
    };

    const encoded = encodeSeriesTable(table);
    assert.ok("seriesGz" in encoded);
    assert.deepEqual(decodeSeriesTable(encoded), table);
  });

  it("passes a raw table through unchanged", () => {
    const table = { tMs: [0, 100], byProcess: { hardhat: [10, 11] } };
    assert.deepEqual(decodeSeriesTable({ series: table }), table);
  });

  it("throws when neither encoding is present", () => {
    assert.throws(() => decodeSeriesTable({}), /neither/);
  });
});

describe("treeTotalMb", () => {
  it("sums all labels in a sample", () => {
    assert.equal(
      treeTotalMb({
        tMs: 0,
        byLabel: new Map([
          ["hardhat", 300],
          ["solc", 512],
        ]),
      }),
      812,
    );
  });
});
