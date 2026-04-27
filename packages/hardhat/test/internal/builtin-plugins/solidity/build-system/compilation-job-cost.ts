/* eslint-disable @typescript-eslint/consistent-type-assertions -- Mirrors
   compilation-job.ts: the `HookContext` shape is intentionally cast in tests
   that don't exercise hooks. */
import type { SolidityCompilerConfig } from "../../../../../src/types/config.js";
import type { HookContext } from "../../../../../src/types/hooks.js";
import type { ResolvedNpmPackage } from "../../../../../src/types/solidity.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  estimateCompilationJobCost,
  sortCompilationJobsByDescendingCost,
} from "../../../../../src/internal/builtin-plugins/solidity/build-system/compilation-job-cost.js";
import { CompilationJobImplementation } from "../../../../../src/internal/builtin-plugins/solidity/build-system/compilation-job.js";
import { DependencyGraphImplementation } from "../../../../../src/internal/builtin-plugins/solidity/build-system/dependency-graph.js";
import { HookManagerImplementation } from "../../../../../src/internal/core/hook-manager.js";
import { ResolvedFileType } from "../../../../../src/types/solidity.js";

// NOTE: These tests are a bit more white-box than ideal, and expectedCost
// mostly duplicates the logic. However, this file also tests some properties
// about the cost function, like the relative influence between the different
// parameters/settings.

const FILE_OVERHEAD = 10_000;

function expectedCost(opts: {
  totalBytes: number;
  fileCount: number;
  viaIR?: boolean;
  optimizer?: boolean;
  runs?: number;
}): number {
  const viaIR = opts.viaIR === true;
  const optimizer = opts.optimizer === true;
  const runs = opts.runs ?? 200;

  const viaIRMul = viaIR ? 6.0 : 1.0;
  const optMul = optimizer ? 1.4 : 1.0;
  const runsMul = optimizer
    ? 1 + Math.min(0.12, Math.log10(Math.max(1, runs)) * 0.04)
    : 1.0;

  return (
    (opts.totalBytes + FILE_OVERHEAD * opts.fileCount) *
    viaIRMul *
    optMul *
    runsMul
  );
}

const testPackage: ResolvedNpmPackage = {
  name: "hardhat-project",
  version: "1.0.0",
  rootFsPath: "/p",
  inputSourceNameRoot: "project",
};

function makeJob(
  fileTexts: string[],
  settings?: SolidityCompilerConfig["settings"],
): CompilationJobImplementation {
  const graph = new DependencyGraphImplementation();
  fileTexts.forEach((text, i) => {
    const file = {
      type: ResolvedFileType.PROJECT_FILE as const,
      inputSourceName: `f${i}.sol`,
      fsPath: `f${i}.sol`,
      content: { text, importPaths: [], versionPragmas: [] },
      package: testPackage,
    };
    graph.addRootFile(file.inputSourceName, file);
  });

  const hooks = new HookManagerImplementation(process.cwd(), []);
  hooks.setContext({} as HookContext);

  return new CompilationJobImplementation(
    graph,
    { version: "0.8.0", settings },
    "0.8.0-c7dfd78",
    hooks,
  );
}

describe("estimateCompilationJobCost", () => {
  describe("file aggregation", () => {
    it("returns 0 for an empty graph", () => {
      assert.equal(estimateCompilationJobCost(makeJob([])), 0);
    });

    it("computes (bytes + overhead) for a single file", () => {
      const text = "a".repeat(500);
      assert.equal(
        estimateCompilationJobCost(makeJob([text])),
        expectedCost({ totalBytes: 500, fileCount: 1 }),
      );
    });

    it("sums file bytes and applies per-file overhead", () => {
      const texts = ["a".repeat(300), "b".repeat(700), "c".repeat(1000)];
      assert.equal(
        estimateCompilationJobCost(makeJob(texts)),
        expectedCost({ totalBytes: 2000, fileCount: 3 }),
      );
    });

    it("charges per-file overhead even when files are empty", () => {
      const cost = estimateCompilationJobCost(makeJob(["", "", ""]));
      assert.equal(cost, FILE_OVERHEAD * 3);
    });

    it("makes many small files cost more than one large file with the same total bytes", () => {
      const totalBytes = 1000;
      const oneLarge = estimateCompilationJobCost(
        makeJob(["x".repeat(totalBytes)]),
      );
      const manySmall = estimateCompilationJobCost(
        makeJob(Array.from({ length: 10 }, () => "x".repeat(totalBytes / 10))),
      );
      assert.ok(
        manySmall > oneLarge,
        `expected many small (${manySmall}) > one large (${oneLarge})`,
      );
    });
  });

  describe("settings plumbing", () => {
    it("treats absent settings as all defaults (no viaIR and no optimizer)", () => {
      const text = "abc";
      const absent = estimateCompilationJobCost(makeJob([text], undefined));
      assert.equal(absent, expectedCost({ totalBytes: 3, fileCount: 1 }));
    });

    it("ignores `runs` when the optimizer is disabled", () => {
      const text = "a".repeat(100);
      const noOptimizer = estimateCompilationJobCost(makeJob([text], {}));
      const optimizerOffWithRuns = estimateCompilationJobCost(
        makeJob([text], { optimizer: { enabled: false, runs: 1_000_000 } }),
      );

      assert.equal(noOptimizer, optimizerOffWithRuns);
    });

    it("applies a 6x multiplier when viaIR === true", () => {
      const text = "a".repeat(100);
      const base = estimateCompilationJobCost(makeJob([text]));
      const withViaIR = estimateCompilationJobCost(
        makeJob([text], { viaIR: true }),
      );

      assert.equal(withViaIR, base * 6);
    });

    it("does not apply the viaIR multiplier when the field is omitted", () => {
      const text = "a".repeat(100);
      const base = estimateCompilationJobCost(makeJob([text]));
      const omitted = estimateCompilationJobCost(makeJob([text], {}));

      assert.equal(base, omitted);
    });

    it("defaults `runs` to 200 when the optimizer is enabled but `runs` is omitted", () => {
      const text = "a".repeat(100);

      const defaulted = estimateCompilationJobCost(
        makeJob([text], { optimizer: { enabled: true } }),
      );

      const explicit = estimateCompilationJobCost(
        makeJob([text], { optimizer: { enabled: true, runs: 200 } }),
      );

      assert.equal(defaulted, explicit);
    });
  });

  describe("runs multiplier", () => {
    const baseFiles = ["a".repeat(100)];

    it("contributes nothing at runs=1", () => {
      const cost = estimateCompilationJobCost(
        makeJob(baseFiles, { optimizer: { enabled: true, runs: 1 } }),
      );

      assert.equal(
        cost,
        expectedCost({
          totalBytes: 100,
          fileCount: 1,
          optimizer: true,
          runs: 1,
        }),
      );
    });

    it("clamps runs < 1 to 1", () => {
      const atZero = estimateCompilationJobCost(
        makeJob(baseFiles, { optimizer: { enabled: true, runs: 0 } }),
      );

      const atOne = estimateCompilationJobCost(
        makeJob(baseFiles, { optimizer: { enabled: true, runs: 1 } }),
      );

      assert.equal(atZero, atOne);
    });

    it("reaches the 0.12 cap exactly at runs=1000", () => {
      const cost = estimateCompilationJobCost(
        makeJob(baseFiles, { optimizer: { enabled: true, runs: 1000 } }),
      );

      // (100 + 10_000) * 1.4 * 1.12
      const expected = (100 + FILE_OVERHEAD) * 1.4 * 1.12;
      assert.equal(cost, expected);
    });

    it("saturates at the cap for very large runs values", () => {
      const atCap = estimateCompilationJobCost(
        makeJob(baseFiles, { optimizer: { enabled: true, runs: 1000 } }),
      );

      const wayAbove = estimateCompilationJobCost(
        makeJob(baseFiles, { optimizer: { enabled: true, runs: 10_000_000 } }),
      );

      assert.equal(atCap, wayAbove);
    });

    it("is monotonically non-decreasing in runs", () => {
      const costs = [1, 10, 100, 1000].map((runs) =>
        estimateCompilationJobCost(
          makeJob(baseFiles, { optimizer: { enabled: true, runs } }),
        ),
      );

      for (let i = 1; i < costs.length; i++) {
        assert.ok(
          costs[i] >= costs[i - 1],
          `cost should be non-decreasing in runs: ${costs.join(" -> ")}`,
        );
      }
    });
  });

  describe("multiplier composition", () => {
    it("multiplies viaIR, optimizer, and runs together", () => {
      const text = "a".repeat(500);

      const cost = estimateCompilationJobCost(
        makeJob([text], {
          viaIR: true,
          optimizer: { enabled: true, runs: 1000 },
        }),
      );

      const base = 500 + FILE_OVERHEAD;
      assert.equal(cost, base * 6 * 1.4 * 1.12);
    });
  });

  describe("relative weight of the multipliers", () => {
    // The intended hierarchy is: viaIR (6x) >> optimizer toggle (1.4x) > runs sweep (<= 1.12x).
    // These tests pin that ordering so the constants can't be re-tuned in a way
    // that silently re-orders the cost knobs.

    const smallGraph = ["a".repeat(100)];
    const largeGraph = Array.from({ length: 10 }, () => "a".repeat(50_000));

    function relativeWeightAssertions(files: string[], label: string): void {
      it(`viaIR alone outweighs optimizer alone with maxed runs (${label})`, () => {
        const viaIROnly = estimateCompilationJobCost(
          makeJob(files, { viaIR: true }),
        );

        const optimizerMaxed = estimateCompilationJobCost(
          makeJob(files, {
            optimizer: { enabled: true, runs: 10_000_000 },
          }),
        );

        assert.ok(
          viaIROnly > optimizerMaxed,
          `viaIR alone (${viaIROnly}) should outweigh optimizer + max runs (${optimizerMaxed})`,
        );
      });

      it(`the optimizer toggle moves cost more than the runs sweep (${label})`, () => {
        const optimizerOff = estimateCompilationJobCost(makeJob(files, {}));

        const optimizerOnLowRuns = estimateCompilationJobCost(
          makeJob(files, { optimizer: { enabled: true, runs: 1 } }),
        );

        const optimizerOnHighRuns = estimateCompilationJobCost(
          makeJob(files, {
            optimizer: { enabled: true, runs: 10_000_000 },
          }),
        );

        const toggleJump = optimizerOnLowRuns - optimizerOff;
        const runsJump = optimizerOnHighRuns - optimizerOnLowRuns;

        assert.ok(
          toggleJump > runsJump,
          `optimizer on/off jump (${toggleJump}) should exceed full runs sweep (${runsJump})`,
        );
      });
    }

    relativeWeightAssertions(smallGraph, "small graph");
    relativeWeightAssertions(largeGraph, "large graph");
  });

  describe("sanity checks", () => {
    it("is deterministic", () => {
      const job = makeJob(["a".repeat(123)], {
        viaIR: true,
        optimizer: { enabled: true, runs: 500 },
      });
      assert.equal(
        estimateCompilationJobCost(job),
        estimateCompilationJobCost(job),
      );
    });
  });
});

describe("sortCompilationJobsByDescendingCost", () => {
  // Three jobs with clearly-separated costs, one per multiplier "tier":
  //   cheap    ≈ 10_000  (no settings)
  //   medium   ≈ 14_000  (optimizer on, default runs)
  //   expensive ≈ 60_000 (viaIR on)
  // The gaps are wide enough to survive constants tuning.
  const cheap = makeJob(["a"]);
  const medium = makeJob(["a"], { optimizer: { enabled: true } });
  const expensive = makeJob(["a"], { viaIR: true });

  it("returns jobs in descending cost order", () => {
    const sorted = sortCompilationJobsByDescendingCost([
      cheap,
      expensive,
      medium,
    ]);
    assert.deepEqual(sorted, [expensive, medium, cheap]);
  });

  it("does not mutate the input array", () => {
    const input = [cheap, expensive, medium];
    const before = [...input];
    sortCompilationJobsByDescendingCost(input);
    assert.deepEqual(input, before);
  });
});
