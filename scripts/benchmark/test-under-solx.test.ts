// Unit tests for the test-execution evaluation harness's decision logic.
//
// The sweep itself cannot be unit-tested — it drives real compilers over real
// repositories. What can be tested is every rule that turns a run's output
// into a verdict, and those rules are the reason to trust the sweep. The
// provenance check in particular was exercised in the 0.1.7 evaluation by a
// single live negative control (`--pair default:default`), which covered one
// of its four failure branches; the rest are covered here.
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";

import {
  type ArtifactEntry,
  type BuildInfoSummary,
  buildReproInconclusiveReason,
  bytecodeScope,
  classify,
  collectInventory,
  collectPrimeSteps,
  compareInventories,
  diffSharedFailures,
  dropForgeSteps,
  evaluateProvenance,
  type Failure,
  type GasProbeObservations,
  gasProbeVerdict,
  hexBytes,
  type InventoryComparison,
  type InventoryResult,
  isForgeStep,
  isResourceLimited,
  installedVersion,
  isTestSource,
  leafName,
  type PairRecord,
  parseCounts,
  parseGasSectionCounts,
  parseMochaFailures,
  parseSolidityFailures,
  renderMarkdown,
  type RunRecord,
  summarizeInventory,
  summaryProblems,
} from "./test-under-solx.ts";

const PIN = "0.1.8";
const SUBJECT_BUILD_INFO = "solc-0_8_34-aaaa";
const BALLAST_BUILD_INFO = "solc-0_4_24-bbbb";

function buildInfo(
  overrides: Partial<BuildInfoSummary> = {},
): BuildInfoSummary {
  return {
    name: "artifacts/build-info/solc-0_8_34-slangSolx-abc.json",
    id: SUBJECT_BUILD_INFO,
    solcVersion: "0.8.34",
    solcLongVersion: `0.8.34+commit.ebeac7c2+solx-${PIN}`,
    compilerType: "slangSolx",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Log parsing
// ---------------------------------------------------------------------------

const MOCHA_LOG = `
  Token
    ✔ transfers
    - is pending

  12 passing (2s)
  1 pending
  2 failing

  1) Token
       transfer
         reverts on insufficient balance:
     AssertionError: expected 0 to equal 1
      at Context.<anonymous> (test/Token.ts:12:5)

  2) Token
       approve
         reverts on the zero address:
     Error: VM Exception while processing transaction: reverted
      at Context.<anonymous> (test/Token.ts:30:5)
`;

const SOLIDITY_LOG = `
  Counter
    ✔ test_Increment
    ✔ testFuzz_SetNumber (runs: 256)

  5 passing (1.2s)
  1 failing
  2 skipped

  1) Counter#test_Overflow
     Error: revert: overflow
      at Counter.t.sol:41
`;

describe("parseCounts", () => {
  it("reads a mocha epilogue", () => {
    assert.deepEqual(parseCounts(MOCHA_LOG), {
      passing: 12,
      failing: 2,
      skipped: 1,
    });
  });

  it("reads a solidity-runner summary", () => {
    assert.deepEqual(parseCounts(SOLIDITY_LOG), {
      passing: 5,
      failing: 1,
      skipped: 2,
    });
  });

  it("takes the run's own summary, not one its tests printed", () => {
    // openzeppelin's suite prints the upstream run's summary from a fixture,
    // and a first-match parse published that as the run's test universe.
    const log = `
  Docs
    ✔ quotes the published summary
      7654 passing (13m)
      4 pending

  500 passing (2m)
  3 failing
  1 skipped
`;
    assert.deepEqual(parseCounts(log), {
      passing: 500,
      failing: 3,
      skipped: 1,
    });
  });

  it("reports an absent count as null rather than zero", () => {
    // A green mocha run prints no failing line at all; zero failures and an
    // unparsed summary are not the same claim.
    assert.deepEqual(parseCounts("\n  12 passing (2s)\n"), {
      passing: 12,
      failing: null,
      skipped: null,
    });
  });
});

describe("parseSolidityFailures", () => {
  it("collects each numbered failure with its detail block", () => {
    const failures = parseSolidityFailures(SOLIDITY_LOG);
    assert.deepEqual(
      failures.map((f) => f.id),
      ["Counter#test_Overflow"],
    );
    assert.match(failures[0].raw, /revert: overflow/);
    assert.equal(failures[0].truncated, false);
  });

  it("ignores a numbered line carrying no contract prefix", () => {
    assert.deepEqual(parseSolidityFailures("\n  1) test_Overflow\n"), []);
  });
});

describe("parseMochaFailures", () => {
  it("joins each failure's title path", () => {
    assert.deepEqual(
      parseMochaFailures(MOCHA_LOG).map((f) => f.id),
      [
        "Token > transfer > reverts on insufficient balance",
        "Token > approve > reverts on the zero address",
      ],
    );
  });

  it("reads the epilogue after the last summary a run printed", () => {
    const log = `
  Docs
    ✔ quotes the published summary
      7654 passing (13m)
      1) Upstream
           quoted failure:

  500 passing (2m)
  1 failing

  1) Token
       transfer
         reverts:
     AssertionError: nope
`;
    assert.deepEqual(
      parseMochaFailures(log).map((f) => f.id),
      ["Token > transfer > reverts"],
    );
  });
});

describe("leafName", () => {
  it("takes the test name after the contract prefix", () => {
    assert.equal(leafName("Counter#test_Overflow"), "test_Overflow");
  });

  it("takes the last segment of a mocha title path", () => {
    assert.equal(leafName("Token > transfer > reverts"), "reverts");
  });
});

describe("evaluateProvenance", () => {
  it("accepts a solx run whose subject build-info is solx at the pin", () => {
    const result = evaluateProvenance([buildInfo()], "solx", PIN);
    assert.equal(result.ok, true);
    assert.equal(result.subjectCount, 1);
    assert.deepEqual(result.problems, []);
  });

  it("rejects a solx run whose subject build-info is plain solc", () => {
    // The failure mode the whole evaluation rests on not happening: the
    // profile silently resolving to solc.
    const result = evaluateProvenance(
      [buildInfo({ compilerType: "solc" })],
      "solx",
      PIN,
    );
    assert.equal(result.ok, false);
    assert.match(result.problems.join(" "), /compilerType "solc"/);
  });

  it("rejects a solx run at the wrong solx version", () => {
    // The failure mode a version bump produces, and the one the pin-coherence
    // machinery exists to prevent.
    const result = evaluateProvenance(
      [buildInfo({ solcLongVersion: "0.8.34+commit.ebeac7c2+solx-0.1.7" })],
      "solx",
      PIN,
    );
    assert.equal(result.ok, false);
    assert.match(result.problems.join(" "), /does not carry the pin 0\.1\.8/);
  });

  it("rejects a solx run with no build-info at the subject version", () => {
    // Ballast-only: the build ran, but nothing proves solx compiled the
    // subject sources.
    const result = evaluateProvenance(
      [buildInfo({ solcVersion: "0.8.25", compilerType: "solc" })],
      "solx",
      PIN,
    );
    assert.equal(result.ok, false);
    assert.equal(result.subjectCount, 0);
    assert.match(result.problems.join(" "), /nothing proves solx compiled/);
  });

  it("rejects a control run carrying solx build-info", () => {
    const result = evaluateProvenance([buildInfo()], "control", PIN);
    assert.equal(result.ok, false);
    assert.match(
      result.problems.join(" "),
      /compilerType "slangSolx" on a control/,
    );
  });

  it("accepts a control run with only solc build-info", () => {
    const result = evaluateProvenance(
      [buildInfo({ compilerType: "solc", solcLongVersion: "0.8.34+commit" })],
      "control",
      PIN,
    );
    assert.equal(result.ok, true);
  });

  it("accepts ballast build-infos at other versions on a control run", () => {
    // lidofinance-core legitimately compiles unrelated trees at upstream's
    // own versions; only the subject version is scoped.
    const result = evaluateProvenance(
      [
        buildInfo({ compilerType: "solc", solcLongVersion: "0.8.34+commit" }),
        buildInfo({
          name: "artifacts/build-info/solc-0_8_25.json",
          solcVersion: "0.8.25",
          compilerType: "solc",
        }),
      ],
      "control",
      PIN,
    );
    assert.equal(result.ok, true);
    assert.equal(result.buildInfoCount, 2);
    assert.equal(result.subjectCount, 1);
  });

  it("fails when the build produced no fresh build-info at all", () => {
    // The branch that fired on the aave control in the 0.1.7 sweep.
    const result = evaluateProvenance([], "solx", PIN);
    assert.equal(result.ok, false);
    assert.match(result.problems.join(" "), /no fresh build-info/);
  });

  it("reports every problem it finds, not just the first", () => {
    const result = evaluateProvenance(
      [
        buildInfo({ compilerType: "solc", solcLongVersion: "0.8.34+commit" }),
        buildInfo({
          name: "artifacts/build-info/other.json",
          solcLongVersion: "0.8.34+commit+solx-0.1.4",
        }),
      ],
      "solx",
      PIN,
    );
    assert.equal(result.ok, false);
    // The solc entry breaks two rules at once (wrong compilerType, and a
    // solcLongVersion with no pin in it); the 0.1.4 entry breaks the pin rule.
    assert.equal(result.problems.length, 3);
    assert.equal(
      result.problems.filter((p) => p.includes("does not carry the pin"))
        .length,
      2,
    );
  });

  it("reports a build-info it could not read rather than passing it", () => {
    // A file that does not parse proves nothing either way, so it must not
    // sail through every rule by having no fields to check.
    const result = evaluateProvenance(
      [{ name: "artifacts/build-info/x.json", unreadable: "Unexpected token" }],
      "solx",
      PIN,
    );
    assert.equal(result.ok, false);
    assert.match(result.problems.join(" "), /could not be read/);
    assert.match(result.problems.join(" "), /nothing proves solx compiled/);
  });
});

describe("hexBytes", () => {
  it("reads a 0x-prefixed hex string as bytes", () => {
    assert.equal(hexBytes("0xdeadbeef"), 4);
  });

  it("treats empty bytecode as zero bytes", () => {
    assert.equal(hexBytes("0x"), 0);
    assert.equal(hexBytes(""), 0);
  });

  it("treats a missing or non-string field as zero bytes", () => {
    // An artifact without deployedBytecode must not become a large contract.
    assert.equal(hexBytes(undefined), 0);
    assert.equal(hexBytes(null), 0);
    assert.equal(hexBytes(1234), 0);
    assert.equal(hexBytes({ length: 40 }), 0);
  });

  it("rounds an odd-length body down rather than up", () => {
    assert.equal(hexBytes("0xabc"), 1);
  });
});

describe("isTestSource", () => {
  it("recognizes the test tree layouts the corpus uses", () => {
    // Measured against the real scenarios: aave uses tests/, uniswap and
    // solady use test/, graph-horizon nests under test/unit/.
    assert.equal(isTestSource("tests/Base.t.sol"), true);
    assert.equal(isTestSource("test/PoolManager.t.sol"), true);
    assert.equal(isTestSource("test/clz/FixedPointMathLib.t.sol"), true);
    assert.equal(
      isTestSource("test/unit/data-service/DataService.t.sol"),
      true,
    );
    assert.equal(isTestSource("contracts/test/Mock.sol"), true);
  });

  it("recognizes a Foundry test contract outside a test directory", () => {
    assert.equal(isTestSource("src/Thing.t.sol"), true);
  });

  it("does not classify production sources as tests", () => {
    assert.equal(isTestSource("src/SwapVM.sol"), false);
    assert.equal(isTestSource("contracts/common/lib/Math256.sol"), false);
    // "latest" contains "test" but is not a test directory.
    assert.equal(isTestSource("src/latest/Thing.sol"), false);
  });
});

function entry(
  id: string,
  runtimeBytes: number,
  overrides: Partial<ArtifactEntry> = {},
): ArtifactEntry {
  return {
    id,
    runtimeBytes,
    creationBytes: runtimeBytes + 100,
    buildInfoId: SUBJECT_BUILD_INFO,
    testSource: isTestSource(id.split(":")[0]),
    ...overrides,
  };
}

/** A subject-scoped inventory over the given entries. */
function inv(
  entries: ArtifactEntry[],
  overrides: Partial<Parameters<typeof summarizeInventory>[0]> = {},
): InventoryResult {
  return summarizeInventory({
    entries,
    subjectBuildInfoIds: [SUBJECT_BUILD_INFO],
    ...overrides,
  });
}

describe("summarizeInventory", () => {
  it("counts artifacts with and without bytecode", () => {
    const result = inv([
      entry("src/A.sol:A", 1000),
      entry("src/I.sol:IThing", 0),
    ]);
    assert.equal(result.artifactCount, 2);
    assert.equal(result.withBytecode, 1);
    assert.equal(result.withoutBytecode, 1);
    assert.equal(result.empty, false);
  });

  it("reports the largest deployed contract and the EIP-170 overshoot", () => {
    const result = inv([
      entry("src/Small.sol:Small", 100),
      entry("src/Big.sol:Big", 40000),
      entry("src/Mid.sol:Mid", 24577),
    ]);
    assert.equal(result.maxRuntimeBytes, 40000);
    assert.equal(result.maxRuntimeContract, "src/Big.sol:Big");
    assert.equal(result.overLimitCount, 2);
    // Named largest-first, with the size in the label.
    assert.match(result.overLimit[0], /src\/Big\.sol:Big \(40000B\)/);
  });

  it("treats exactly the limit as within the limit", () => {
    assert.equal(inv([entry("src/A.sol:A", 24576)]).overLimitCount, 0);
  });

  it("marks a build with no artifacts as empty", () => {
    const result = inv([]);
    assert.equal(result.empty, true);
    assert.equal(result.maxRuntimeContract, null);
  });

  it("scopes the subject population to the subject build-infos", () => {
    // lidofinance-core's shape: the artifacts root holds solc ballast from
    // other versions alongside the subject compile.
    const result = inv([
      entry("src/A.sol:A", 0),
      entry("legacy/Old.sol:Old", 5000, {
        buildInfoId: BALLAST_BUILD_INFO,
      }),
    ]);
    assert.equal(result.artifactCount, 2);
    // Project-wide, one artifact carries bytecode — the ballast one.
    assert.equal(result.withBytecode, 1);
    // Scoped to the subject compile, nothing does. This is the difference
    // that decides whether an all-empty subject build is visible.
    assert.equal(result.subject.artifactCount, 1);
    assert.equal(result.subject.withBytecode, 0);
  });

  it("does not attribute an artifact with no buildInfoId to the subject", () => {
    const result = inv([entry("src/A.sol:A", 10, { buildInfoId: null })]);
    assert.equal(result.subject.artifactCount, 0);
  });

  it("splits the subject population into deployable and test-harness", () => {
    // Solidity-test harness contracts are deployed with the code-size limit
    // lifted, so an over-limit count that includes them is not a fact about
    // either compiler.
    const result = inv([
      entry("src/A.sol:A", 30000),
      entry("test/Huge.t.sol:HugeTest", 200000),
    ]);
    assert.equal(result.overLimitCount, 2);
    assert.equal(result.subjectDeployable.overLimitCount, 1);
    assert.equal(result.subjectDeployable.maxRuntimeContract, "src/A.sol:A");
    assert.equal(result.subjectTestHarness.overLimitCount, 1);
    assert.equal(result.subjectTestHarness.maxRuntimeBytes, 200000);
  });

  it("records no subject build-infos when none were supplied", () => {
    // The fallback case: nothing to scope by, which the caller has to say out
    // loud rather than report an empty subject population as a clean one.
    const result = summarizeInventory({ entries: [entry("src/A.sol:A", 10)] });
    assert.equal(result.subjectBuildInfoCount, 0);
    assert.equal(result.subject.artifactCount, 0);
  });

  it("counts and names unparseable artifacts", () => {
    const many = Array.from(
      { length: 30 },
      (_, i) => `artifacts/x${i}.json: e`,
    );
    const result = inv([entry("src/A.sol:A", 10)], { unparseable: many });
    assert.equal(result.unparseableCount, 30);
    assert.equal(result.unparseable.length, 25);
  });

  it("copies the entry list instead of aliasing the caller's array", () => {
    const entries = [entry("src/A.sol:A", 10)];
    const result = inv(entries);
    entries.push(entry("src/B.sol:B", 20));
    assert.equal(result.entries.length, 1);
  });
});

describe("compareInventories", () => {
  it("finds contracts with bytecode on the control and none under solx", () => {
    // The 1inch-swap-vm defect shape: artifacts present, bytecode absent,
    // every other gate green.
    const comparison = compareInventories(
      inv([entry("src/A.sol:A", 0), entry("src/B.sol:B", 50)]),
      inv([entry("src/A.sol:A", 1000), entry("src/B.sol:B", 50)]),
    );
    assert.equal(comparison.comparable, true);
    assert.deepEqual(comparison.emptyUnderSolx, ["src/A.sol:A"]);
    assert.equal(comparison.bothNonEmpty, 1);
  });

  it("does not flag interfaces, which are empty on both sides", () => {
    const both = [entry("src/I.sol:I", 0), entry("src/A.sol:A", 900)];
    const comparison = compareInventories(inv(both), inv(both));
    assert.deepEqual(comparison.emptyUnderSolx, []);
    assert.deepEqual(comparison.missingUnderSolx, []);
    assert.equal(comparison.bothNonEmpty, 1);
  });

  it("reports artifacts missing from, and extra on, the solx side", () => {
    const comparison = compareInventories(
      inv([entry("src/A.sol:A", 10), entry("src/X.sol:X", 10)]),
      inv([entry("src/A.sol:A", 10), entry("src/B.sol:B", 10)]),
    );
    assert.deepEqual(comparison.missingUnderSolx, ["src/B.sol:B"]);
    assert.deepEqual(comparison.extraUnderSolx, ["src/X.sol:X"]);
  });

  it("is not comparable when either side produced nothing", () => {
    const populated = inv([entry("src/A.sol:A", 10)]);
    const nothing = inv([]);
    assert.equal(compareInventories(nothing, populated).comparable, false);
    assert.equal(compareInventories(populated, nothing).comparable, false);
  });
});

// ---------------------------------------------------------------------------
// Verdicts
// ---------------------------------------------------------------------------

function run(overrides: Partial<RunRecord> = {}): RunRecord {
  const { entries: _entries, ...inventory } = inv([entry("src/A.sol:A", 500)]);
  return {
    profile: "solx-0.1.8",
    side: "solx",
    command: "npx hardhat test solidity",
    exitCode: 0,
    signal: null,
    durationMs: 1000,
    passing: 10,
    failing: 0,
    skipped: 0,
    failures: [],
    provenance: { ok: true, buildInfoCount: 1, subjectCount: 1, problems: [] },
    inventory,
    compileErrorMarker: false,
    resourceLimited: false,
    spawnError: null,
    logFile: "logs/x.log",
    ...overrides,
  };
}

/** A run record whose inventory summarizes the given entries. */
function withInventory(
  entries: ArtifactEntry[],
  overrides: Partial<RunRecord> = {},
  inventoryOverrides: Partial<Parameters<typeof summarizeInventory>[0]> = {},
): RunRecord {
  const { entries: _entries, ...inventory } = inv(entries, inventoryOverrides);
  return run({ inventory, ...overrides });
}

const COMPARABLE: InventoryComparison = {
  comparable: true,
  emptyUnderSolx: [],
  missingUnderSolx: [],
  extraUnderSolx: [],
  bothNonEmpty: 1,
};

describe("classify", () => {
  it("passes a clean solx run against a clean control", () => {
    const result = classify(run(), run({ side: "control" }), COMPARABLE);
    assert.equal(result.verdict, "pass");
  });

  /** The record runSide produces when the process never started at all. */
  function spawnFailed(overrides: Partial<RunRecord> = {}): RunRecord {
    return withInventory([], {
      exitCode: null,
      signal: null,
      passing: null,
      failing: null,
      skipped: null,
      spawnError: "Error: spawnSync npx ENOENT",
      ...overrides,
    });
  }

  it("calls a run that could not be spawned harness-failures", () => {
    const result = classify(
      spawnFailed(),
      run({ side: "control" }),
      COMPARABLE,
    );
    assert.equal(result.verdict, "harness-failures");
    assert.match(result.detail, /ENOENT/);
  });

  it("never reads a failed spawn as a compiler verdict", () => {
    // A spawn error leaves exactly what a rejected build leaves — exit null,
    // no compile-error marker, no artifacts — so the cannot-compile guards
    // below would publish a host failure as a solx limitation.
    const result = classify(
      spawnFailed({ compileErrorMarker: false }),
      run({ side: "control" }),
      COMPARABLE,
    );
    assert.notEqual(result.verdict, "cannot-compile");
  });

  it("calls a subject build with no bytecode cannot-compile", () => {
    // The headline fix. solx 0.1.7 on 1inch-swap-vm wrote 242 artifacts that
    // all carried empty bytecode, exited 0, and returned an empty errors
    // array; every other gate stayed green.
    const solx = withInventory([
      entry("src/A.sol:A", 0),
      entry("src/B.sol:B", 0),
    ]);
    const result = classify(solx, run({ side: "control" }), COMPARABLE);
    assert.equal(result.verdict, "cannot-compile");
    assert.match(result.detail, /NONE carries bytecode/);
  });

  it("is not masked by ballast from other solc versions", () => {
    // lidofinance-core compiles six other solc versions into the same
    // artifacts root. Project-wide, their bytecode alone makes the build look
    // productive while every subject artifact is empty.
    const solx = withInventory([
      entry("src/A.sol:A", 0),
      entry("legacy/Old.sol:Old", 9000, { buildInfoId: BALLAST_BUILD_INFO }),
    ]);
    assert.equal(solx.inventory.withBytecode, 1);
    const result = classify(solx, run({ side: "control" }), COMPARABLE);
    assert.equal(result.verdict, "cannot-compile");
    assert.match(result.detail, /at solc 0\.8\.34/);
  });

  it("falls back to the project-wide population and says so", () => {
    // No fresh build-info at the subject version means there is nothing to
    // scope by. The guard still runs, over everything, and the detail names
    // the scope it used.
    const solx = withInventory(
      [entry("src/A.sol:A", 0, { buildInfoId: null })],
      {},
      { subjectBuildInfoIds: [] },
    );
    const result = classify(solx, run({ side: "control" }), COMPARABLE);
    assert.equal(result.verdict, "cannot-compile");
    assert.match(result.detail, /project-wide/);
  });

  it("reports an artifact set that cannot be attributed to the subject", () => {
    const solx = withInventory([
      entry("src/A.sol:A", 500, { buildInfoId: BALLAST_BUILD_INFO }),
    ]);
    const result = classify(solx, run({ side: "control" }), COMPARABLE);
    assert.equal(result.verdict, "harness-failures");
    assert.match(result.detail, /attribution failed/);
  });

  it("keeps cannot-compile ahead of the provenance gate", () => {
    // The ordering was got wrong once already: build-info is only written when
    // the whole build succeeds, so a provenance-first order reports an empty
    // build as invalid-provenance and loses the compiler result.
    const solx = withInventory([entry("src/A.sol:A", 0)], {
      provenance: {
        ok: false,
        buildInfoCount: 1,
        subjectCount: 1,
        problems: ["compilerType is solc"],
      },
    });
    assert.equal(
      classify(solx, run({ side: "control" }), COMPARABLE).verdict,
      "cannot-compile",
    );
  });

  it("keeps cannot-compile ahead of the universe-shortfall gate", () => {
    // An empty build also runs no tests, and a shortfall-first order would
    // file the compiler defect as a harness problem.
    const solx = withInventory([entry("src/A.sol:A", 0)], {
      passing: 0,
      failing: 0,
    });
    const control = run({ side: "control", passing: 500 });
    assert.equal(classify(solx, control, COMPARABLE).verdict, "cannot-compile");
  });

  it("calls a failed build with no artifacts cannot-compile", () => {
    const solx = withInventory([], {
      exitCode: 1,
      passing: null,
      failing: null,
      skipped: null,
    });
    const result = classify(solx, run({ side: "control" }), COMPARABLE);
    assert.equal(result.verdict, "cannot-compile");
    assert.match(result.detail, /no artifacts were produced/);
  });

  it("names a host resource limit rather than a compiler rejection", () => {
    const solx = withInventory([], {
      exitCode: null,
      signal: "SIGKILL",
      resourceLimited: true,
      passing: null,
      failing: null,
      skipped: null,
    });
    const result = classify(solx, run({ side: "control" }), COMPARABLE);
    assert.equal(result.verdict, "cannot-compile");
    assert.match(result.detail, /HOST RESOURCE LIMIT/);
  });

  it("rejects a run whose provenance failed", () => {
    const solx = run({
      provenance: {
        ok: false,
        buildInfoCount: 1,
        subjectCount: 1,
        problems: ["compilerType is solc"],
      },
    });
    assert.equal(
      classify(solx, run({ side: "control" }), COMPARABLE).verdict,
      "invalid-provenance",
    );
  });

  it("distrusts a comparison over artifacts that did not parse", () => {
    // On the control side a dropped artifact shrinks the baseline the solx
    // side is compared against, so it can only ever weaken an assert.
    const control = withInventory(
      [entry("src/A.sol:A", 500)],
      { side: "control" },
      { unparseable: ["artifacts/src/B.sol/B.json: Unexpected end of JSON"] },
    );
    const result = classify(run(), control, COMPARABLE);
    assert.equal(result.verdict, "harness-failures");
    assert.match(result.detail, /unparseable artifact/);
  });

  it("calls a green run that executed nothing harness-failures", () => {
    const solx = run({ passing: 0, failing: 0 });
    const control = run({ side: "control", passing: 706 });
    const result = classify(solx, control, COMPARABLE);
    assert.equal(result.verdict, "harness-failures");
    assert.match(result.detail, /executed no tests/);
  });

  it("calls a partial test-universe shortfall harness-failures", () => {
    const result = classify(
      run({ passing: 100 }),
      run({ side: "control", passing: 706 }),
      COMPARABLE,
    );
    assert.equal(result.verdict, "harness-failures");
    assert.match(result.detail, /below the 90% floor/);
  });

  it("accepts a test count just inside the floor", () => {
    assert.equal(
      classify(
        run({ passing: 90 }),
        run({ side: "control", passing: 100 }),
        COMPARABLE,
      ).verdict,
      "pass",
    );
  });

  it("calls a control-side test-universe shortfall harness-failures", () => {
    // The mirror of the shortfall above: whichever side lost the suites, the
    // two sides did not run the same one, so the set-difference is not a
    // solx result.
    const result = classify(
      run({ passing: 706 }),
      run({ side: "control", passing: 100 }),
      COMPARABLE,
    );
    assert.equal(result.verdict, "harness-failures");
    assert.match(result.detail, /the control executed 100 tests/);
    assert.match(result.detail, /below the 90% floor/);
  });

  it("accepts a control count just inside the floor", () => {
    assert.equal(
      classify(
        run({ passing: 100 }),
        run({ side: "control", passing: 90 }),
        COMPARABLE,
      ).verdict,
      "pass",
    );
  });

  it("does not read a control that never ran the suite as a shortfall", () => {
    // The pass-uncontrolled shapes: a control whose own run is untrustworthy
    // has no test universe to be short of, so its low count is not evidence
    // about solx.
    const result = classify(
      run({ passing: 100 }),
      run({ side: "control", passing: 5, exitCode: 1, failing: 0 }),
      COMPARABLE,
    );
    assert.equal(result.verdict, "pass-uncontrolled");
  });

  it("does not read a control that produced no artifacts as a shortfall", () => {
    const result = classify(
      run({ passing: 100 }),
      withInventory([], { side: "control", passing: 5 }),
      COMPARABLE,
    );
    assert.equal(result.verdict, "pass-uncontrolled");
    assert.match(result.detail, /produced no artifacts/);
  });

  it("flags contracts empty under solx and non-empty on the control", () => {
    const result = classify(run(), run({ side: "control" }), {
      ...COMPARABLE,
      emptyUnderSolx: ["src/A.sol:A"],
    });
    assert.equal(result.verdict, "harness-failures");
    assert.match(result.detail, /bytecode inventory mismatch/);
  });

  it("flags artifacts the control produced and solx did not", () => {
    const result = classify(run(), run({ side: "control" }), {
      ...COMPARABLE,
      missingUnderSolx: ["src/B.sol:B"],
    });
    assert.equal(result.verdict, "harness-failures");
    assert.match(result.detail, /artifact inventory mismatch/);
  });

  it("disables both inventory guards when the sides are not comparable", () => {
    // The condition under which the scoped bytecode guard is the only
    // remaining layer: an empty side makes the per-contract comparison
    // meaningless, so it must not be read as a result either way.
    const incomparable: InventoryComparison = {
      comparable: false,
      emptyUnderSolx: ["src/A.sol:A"],
      missingUnderSolx: ["src/B.sol:B"],
      extraUnderSolx: [],
      bothNonEmpty: 0,
    };
    const result = classify(run(), run({ side: "control" }), incomparable);
    assert.equal(result.verdict, "pass");
  });

  describe("pass vs pass-uncontrolled", () => {
    it("is pass-uncontrolled when the control's provenance failed", () => {
      const control = run({
        side: "control",
        provenance: {
          ok: false,
          buildInfoCount: 0,
          subjectCount: 0,
          problems: ["no fresh build-info files found"],
        },
      });
      const result = classify(run(), control, COMPARABLE);
      assert.equal(result.verdict, "pass-uncontrolled");
      assert.match(result.detail, /control provenance failed/);
    });

    it("is pass-uncontrolled when the control's summary is untrustworthy", () => {
      const control = run({ side: "control", exitCode: 1, failing: 0 });
      const result = classify(run(), control, COMPARABLE);
      assert.equal(result.verdict, "pass-uncontrolled");
      assert.match(result.detail, /control-side issue/);
    });

    it("is pass-uncontrolled when the control executed no tests", () => {
      const control = run({ side: "control", passing: 0, failing: 0 });
      const result = classify(run(), control, COMPARABLE);
      assert.equal(result.verdict, "pass-uncontrolled");
      assert.match(result.detail, /executed no tests/);
    });

    it("is pass-uncontrolled when the control produced no artifacts", () => {
      const control = withInventory([], { side: "control" });
      const result = classify(run(), control, COMPARABLE);
      assert.equal(result.verdict, "pass-uncontrolled");
      assert.match(result.detail, /produced no artifacts/);
    });

    it("is a plain pass when the control is sound", () => {
      assert.equal(
        classify(run(), run({ side: "control" }), COMPARABLE).verdict,
        "pass",
      );
    });
  });

  it("cannot compute a set-difference for failures with no control", () => {
    const solx = run({
      failing: 1,
      failures: [{ id: "T#a", raw: "boom", truncated: false }],
      exitCode: 1,
    });
    const control = run({ side: "control", passing: 0, failing: 0 });
    const result = classify(solx, control, COMPARABLE);
    assert.equal(result.verdict, "harness-failures");
    assert.match(result.detail, /set-difference not computable/);
  });

  it("surfaces a compile-error pattern found in a passing run's log", () => {
    const result = classify(
      run({ compileErrorMarker: true }),
      run({ side: "control" }),
      COMPARABLE,
    );
    assert.equal(result.verdict, "pass");
    assert.match(result.detail, /compile-error pattern present/);
  });
});

describe("bytecodeScope", () => {
  it("uses the subject population when the run has subject build-infos", () => {
    const { entries: _entries, ...inventory } = inv([entry("src/A.sol:A", 10)]);
    const { scope, label } = bytecodeScope(inventory);
    assert.equal(scope.artifactCount, 1);
    assert.match(label, /at solc 0\.8\.34/);
  });

  it("falls back to the project-wide population and labels it", () => {
    const { entries: _entries, ...inventory } = summarizeInventory({
      entries: [entry("src/A.sol:A", 10, { buildInfoId: null })],
    });
    const { scope, label } = bytecodeScope(inventory);
    assert.equal(scope.artifactCount, 1);
    assert.match(label, /project-wide/);
  });
});

describe("isResourceLimited", () => {
  it("recognizes the two shapes an OOM kill arrives in", () => {
    const base = { output: "", durationMs: 1, spawnError: null };
    assert.equal(
      isResourceLimited({ ...base, exitCode: null, signal: "SIGKILL" }),
      true,
    );
    assert.equal(
      isResourceLimited({ ...base, exitCode: 137, signal: null }),
      true,
    );
  });

  it("does not treat an ordinary failure as a resource limit", () => {
    const base = { output: "", durationMs: 1, spawnError: null };
    assert.equal(
      isResourceLimited({ ...base, exitCode: 1, signal: null }),
      false,
    );
    assert.equal(
      isResourceLimited({ ...base, exitCode: null, signal: "SIGTERM" }),
      false,
    );
  });
});

describe("summaryProblems", () => {
  it("accepts a run whose summary matches its parsed failures", () => {
    assert.equal(summaryProblems(run()), null);
    assert.equal(
      summaryProblems(
        run({
          exitCode: 1,
          failing: 1,
          failures: [{ id: "T#a", raw: "boom", truncated: false }],
        }),
      ),
      null,
    );
  });

  it("rejects a run that printed no summary at all", () => {
    const problem = summaryProblems(
      run({ passing: null, failing: null, skipped: null, exitCode: 1 }),
    );
    assert.match(problem ?? "", /aborted with no test summary/);
  });

  it("rejects a non-zero exit with no parsed failures", () => {
    assert.match(
      summaryProblems(run({ exitCode: 1 })) ?? "",
      /non-zero exit \(1\) with no parsed test failures/,
    );
  });

  it("rejects a summary count that disagrees with the parsed identifiers", () => {
    assert.match(
      summaryProblems(run({ exitCode: 1, failing: 3 })) ?? "",
      /failure parse mismatch/,
    );
  });
});

// ---------------------------------------------------------------------------
// Artifact discovery on disk
// ---------------------------------------------------------------------------

const tempDirs: string[] = [];

after(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

/** A project tree with one build-info dir and the given artifact files. */
function makeProject(files: Record<string, unknown | string>): string {
  const root = mkdtempSync(path.join(tmpdir(), "test-under-solx-"));
  tempDirs.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(
      full,
      typeof content === "string" ? content : JSON.stringify(content),
    );
  }
  return root;
}

function artifact(
  sourceName: string,
  contractName: string,
  deployedBytecode = "0x1234",
  buildInfoId: string | null = SUBJECT_BUILD_INFO,
): Record<string, unknown> {
  return {
    _format: "hh3-artifact-1",
    contractName,
    sourceName,
    abi: [],
    bytecode: "0xff",
    deployedBytecode,
    ...(buildInfoId === null ? {} : { buildInfoId }),
  };
}

const SUBJECT_BUILD_INFO_FILE = {
  id: SUBJECT_BUILD_INFO,
  solcVersion: "0.8.34",
  solcLongVersion: "0.8.34+commit.ebeac7c2+solx-0.1.8",
  compilerType: "slangSolx",
};

describe("collectInventory", () => {
  it("finds artifacts under the build-info dir's parent", () => {
    // Discovery follows the build-info dirs rather than assuming
    // artifacts/build-info, because graph-horizon relocates the root.
    const root = makeProject({
      "build/contracts/build-info/x.json": SUBJECT_BUILD_INFO_FILE,
      "build/contracts/src/A.sol/A.json": artifact("src/A.sol", "A"),
      "build/contracts/src/I.sol/I.json": artifact("src/I.sol", "I", "0x"),
    });
    const result = collectInventory(root, 0);
    assert.equal(result.artifactCount, 2);
    assert.equal(result.withBytecode, 1);
    assert.deepEqual(result.entries.map((e) => e.id).sort(), [
      "src/A.sol:A",
      "src/I.sol:I",
    ]);
  });

  it("attributes each artifact to the build-info it names", () => {
    const root = makeProject({
      "artifacts/build-info/x.json": SUBJECT_BUILD_INFO_FILE,
      "artifacts/build-info/y.json": {
        id: BALLAST_BUILD_INFO,
        solcVersion: "0.4.24",
        compilerType: "solc",
      },
      "artifacts/src/A.sol/A.json": artifact("src/A.sol", "A"),
      "artifacts/legacy/Old.sol/Old.json": artifact(
        "legacy/Old.sol",
        "Old",
        "0xabcdef",
        BALLAST_BUILD_INFO,
      ),
    });
    const result = collectInventory(root, 0);
    assert.equal(result.artifactCount, 2);
    assert.equal(result.subjectBuildInfoCount, 1);
    assert.equal(result.subject.artifactCount, 1);
    assert.equal(result.subject.maxRuntimeContract, "src/A.sol:A");
  });

  it("ignores artifacts older than the run it is measuring", () => {
    // graph-horizon ships committed ignition build-info and artifact trees
    // whose files really do look like artifacts.
    const root = makeProject({
      "artifacts/build-info/x.json": SUBJECT_BUILD_INFO_FILE,
      "artifacts/src/A.sol/A.json": artifact("src/A.sol", "A"),
      "artifacts/committed/Old.sol/Old.json": artifact(
        "committed/Old.sol",
        "Old",
      ),
    });
    const old = new Date("2020-01-01T00:00:00Z");
    utimesSync(
      path.join(root, "artifacts/committed/Old.sol/Old.json"),
      old,
      old,
    );
    const result = collectInventory(root, Date.now() - 60_000);
    assert.deepEqual(
      result.entries.map((e) => e.id),
      ["src/A.sol:A"],
    );
  });

  it("returns an empty inventory when no fresh build-info exists", () => {
    const root = makeProject({
      "artifacts/src/A.sol/A.json": artifact("src/A.sol", "A"),
    });
    const result = collectInventory(root, 0);
    assert.equal(result.empty, true);
    assert.equal(result.artifactCount, 0);
  });

  it("identifies artifacts structurally, not by path", () => {
    // The artifacts root also holds build manifests and typing files.
    const root = makeProject({
      "artifacts/build-info/x.json": SUBJECT_BUILD_INFO_FILE,
      "artifacts/src/A.sol/A.json": artifact("src/A.sol", "A"),
      "artifacts/package.json": { name: "decoy", version: "1.0.0" },
      "artifacts/artifacts.d.json": { contractName: "NoSourceName" },
      "artifacts/src/A.sol/A.dbg.json": {
        buildInfo: "../../build-info/x.json",
      },
    });
    const result = collectInventory(root, 0);
    assert.deepEqual(
      result.entries.map((e) => e.id),
      ["src/A.sol:A"],
    );
  });

  it("counts an artifact whose JSON does not parse", () => {
    // Dropping it silently would shrink the control baseline the solx side is
    // compared against, so a parse failure could only ever weaken an assert.
    const root = makeProject({
      "artifacts/build-info/x.json": SUBJECT_BUILD_INFO_FILE,
      "artifacts/src/A.sol/A.json": artifact("src/A.sol", "A"),
      "artifacts/src/B.sol/B.json": '{"contractName": "B", "sourceNa',
    });
    const result = collectInventory(root, 0);
    assert.equal(result.artifactCount, 1);
    assert.equal(result.unparseableCount, 1);
    assert.match(result.unparseable[0], /src\/B\.sol\/B\.json/);
  });

  it("counts one contract once when two roots hold it", () => {
    const root = makeProject({
      "artifacts/build-info/x.json": SUBJECT_BUILD_INFO_FILE,
      "artifacts/src/A.sol/A.json": artifact("src/A.sol", "A"),
      "build/contracts/build-info/y.json": SUBJECT_BUILD_INFO_FILE,
      "build/contracts/src/A.sol/A.json": artifact("src/A.sol", "A"),
    });
    const result = collectInventory(root, 0);
    assert.equal(result.artifactCount, 1);
  });

  it("never descends into node_modules or .git", () => {
    const root = makeProject({
      "artifacts/build-info/x.json": SUBJECT_BUILD_INFO_FILE,
      "artifacts/src/A.sol/A.json": artifact("src/A.sol", "A"),
      "node_modules/dep/artifacts/build-info/y.json": SUBJECT_BUILD_INFO_FILE,
      "node_modules/dep/artifacts/src/D.sol/D.json": artifact("src/D.sol", "D"),
      ".git/artifacts/build-info/z.json": SUBJECT_BUILD_INFO_FILE,
    });
    const result = collectInventory(root, 0);
    assert.deepEqual(
      result.entries.map((e) => e.id),
      ["src/A.sol:A"],
    );
  });

  it("reports a build-info file it could not parse", () => {
    const root = makeProject({
      "artifacts/build-info/x.json": "{not json",
      "artifacts/src/A.sol/A.json": artifact("src/A.sol", "A"),
    });
    // The dir is still discovered, so the artifacts are still walked; the
    // subject scope is simply unavailable.
    const result = collectInventory(root, 0);
    assert.equal(result.artifactCount, 1);
    assert.equal(result.subjectBuildInfoCount, 0);
  });
});

// ---------------------------------------------------------------------------
// Prime steps
// ---------------------------------------------------------------------------

describe("collectPrimeSteps", () => {
  it("collects the measure:false steps of every step sequence, in order", () => {
    const steps = collectPrimeSteps({
      benchmark: {
        commands: {
          "prime compilers": {
            runs: 1,
            steps: {
              "relax dependency pragmas": {
                command: "node ./relax-dep-pragmas.cjs",
                measure: false,
              },
              "warm caches": { command: "npx hardhat compile", measure: false },
            },
          },
          "cold compile solx": { runs: 2, command: "npx hardhat compile" },
        },
      },
    });
    assert.deepEqual(
      steps.map((s) => s.name),
      ["relax dependency pragmas", "warm caches"],
    );
    assert.equal(steps[0].command, "node ./relax-dep-pragmas.cjs");
  });

  it("skips measured steps, which are measurements rather than preparation", () => {
    const steps = collectPrimeSteps({
      benchmark: {
        commands: {
          seq: {
            runs: 1,
            steps: {
              prepare: { command: "echo prep", measure: false },
              timed: { command: "echo timed" },
              explicit: { command: "echo timed", measure: true },
            },
          },
        },
      },
    });
    assert.deepEqual(
      steps.map((s) => s.name),
      ["prepare"],
    );
  });

  it("returns nothing for a scenario that declares no steps", () => {
    assert.deepEqual(collectPrimeSteps({}), []);
    assert.deepEqual(collectPrimeSteps({ benchmark: { commands: {} } }), []);
  });
});

describe("dropForgeSteps", () => {
  it("recognizes the forge invocations the scenarios declare", () => {
    assert.equal(
      isForgeStep({
        name: "warm forge solc cache",
        command:
          "FOUNDRY_SOLC=0.8.34 ./.foundry/forge build --skip script && ./.foundry/forge clean",
      }),
      true,
    );
    assert.equal(
      isForgeStep({
        name: "workspace deps",
        command: "pnpm --filter '@graphprotocol/horizon^...' run build:self",
      }),
      false,
    );
    // A path or script name that merely contains the word must not match.
    assert.equal(
      isForgeStep({ name: "x", command: "node ./forged-tool.cjs" }),
      false,
    );
    assert.equal(
      isForgeStep({ name: "x", command: "pnpm run forge-lint" }),
      false,
    );
    assert.equal(
      isForgeStep({ name: "x", command: "npm run forge_fmt" }),
      false,
    );
  });

  it("keeps every non-forge step and reports what it dropped", () => {
    const { kept, skipped } = dropForgeSteps([
      { name: "relax pragmas", command: "node ./relax-dep-pragmas.cjs" },
      { name: "warm forge", command: "./.foundry/forge build && forge clean" },
    ]);
    assert.deepEqual(
      kept.map((s) => s.name),
      ["relax pragmas"],
    );
    assert.deepEqual(
      skipped.map((s) => s.name),
      ["warm forge"],
    );
  });
});

describe("the real solx scenario definitions", () => {
  // A property of the scenario corpus, not of the code: a future scenario edit
  // that added a second step sequence, or forgot measure:false on a
  // preparation step, would make the sweep run a measured compile as
  // preparation or run one twice — and no synthetic test would notice.
  const scenarioDir = path.join(import.meta.dirname, "..", "..", "end-to-end");
  const solxScenarios = readdirSync(scenarioDir)
    .map((dir) => path.join(scenarioDir, dir, "scenario.json"))
    .filter((file) => {
      try {
        return JSON.parse(readFileSync(file, "utf8")).tags?.includes("solx");
      } catch {
        return false;
      }
    });

  it("finds the solx scenario corpus", () => {
    assert.ok(
      solxScenarios.length >= 9,
      `expected at least 9 solx scenarios, found ${solxScenarios.length}`,
    );
  });

  for (const file of solxScenarios) {
    const name = path.basename(path.dirname(file));
    const definition = JSON.parse(readFileSync(file, "utf8"));

    it(`${name} declares exactly one step sequence`, () => {
      const withSteps = Object.entries(
        definition.benchmark?.commands ?? {},
      ).filter(
        ([, command]) => (command as { steps?: unknown }).steps !== undefined,
      );
      assert.equal(withSteps.length, 1);
      assert.equal(withSteps[0][0], "prime compilers");
    });

    it(`${name} marks every step of that sequence measure:false`, () => {
      // A measure:true step is a timed measurement, and running it as
      // preparation would both cost a compile and execute it twice.
      const sequence = definition.benchmark.commands["prime compilers"];
      const steps = Object.values(sequence.steps) as Array<{
        measure?: boolean;
      }>;
      assert.ok(steps.length > 0);
      for (const step of steps) {
        assert.equal(step.measure, false);
      }
      assert.equal(collectPrimeSteps(definition).length, steps.length);
    });

    it(`${name}'s measured commands declare no steps of their own`, () => {
      for (const [label, command] of Object.entries(
        definition.benchmark.commands as Record<string, { steps?: unknown }>,
      )) {
        if (label !== "prime compilers") {
          assert.equal(command.steps, undefined);
        }
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Shared failures and probe parsing
// ---------------------------------------------------------------------------

function failure(id: string, raw: string, truncated = false): Failure {
  return { id, raw, truncated };
}

describe("diffSharedFailures", () => {
  it("marks byte-identical failure text as identical", () => {
    const failures = [failure("T#test", "assertion failed: 1 != 2")];
    const diffs = diffSharedFailures(failures, failures, ["T#test"]);
    assert.equal(diffs[0].identicalRaw, true);
    assert.deepEqual(diffs[0].found, { solx: true, control: true });
    assert.equal(diffs[0].rawDivergence, undefined);
  });

  it("reports the first differing line when the two texts diverge", () => {
    // A shared identifier failing for two different reasons is excluded from
    // the solx verdict as noise, so the divergence has to be visible.
    const diffs = diffSharedFailures(
      [failure("T#test", "same line\nsolx reason")],
      [failure("T#test", "same line\ncontrol reason")],
      ["T#test"],
    );
    assert.equal(diffs[0].identicalRaw, false);
    assert.deepEqual(diffs[0].rawDivergence, {
      solx: "solx reason",
      control: "control reason",
    });
  });

  it("handles one side's text running out", () => {
    const diffs = diffSharedFailures(
      [failure("T#test", "line\nextra")],
      [failure("T#test", "line")],
      ["T#test"],
    );
    assert.equal(diffs[0].identicalRaw, false);
    assert.equal(diffs[0].rawDivergence?.control, "<end of text>");
  });

  it("does not call two absent failures identical", () => {
    // Two misses compare equal, and "identical on both sides" is the claim
    // that justifies dropping the failure from the solx verdict.
    const diffs = diffSharedFailures([], [], ["T#test"]);
    assert.equal(diffs[0].identicalRaw, null);
    assert.deepEqual(diffs[0].found, { solx: false, control: false });
  });

  it("does not call a one-sided failure identical", () => {
    const diffs = diffSharedFailures(
      [failure("T#test", "boom")],
      [],
      ["T#test"],
    );
    assert.equal(diffs[0].identicalRaw, null);
    assert.deepEqual(diffs[0].found, { solx: true, control: false });
  });

  it("flags a match that only holds over a truncated prefix", () => {
    const diffs = diffSharedFailures(
      [failure("T#test", "same", true)],
      [failure("T#test", "same")],
      ["T#test"],
    );
    assert.equal(diffs[0].identicalRaw, true);
    assert.equal(diffs[0].prefixOnly, true);
  });
});

describe("parseGasSectionCounts", () => {
  it("reads the counts the check prints for itself", () => {
    const log = [
      "Snapshot check failed",
      "",
      "Function gas snapshots: 12 changed, 3 added, 1 removed",
      "",
      "  - Foo#bar() (gas: 100 -> 120)",
    ].join("\n");
    assert.deepEqual(parseGasSectionCounts(log, "Function gas snapshots"), {
      changed: 12,
      added: 3,
      removed: 1,
    });
  });

  it("reads a header that lists only some of the three", () => {
    assert.deepEqual(
      parseGasSectionCounts(
        "Snapshot cheatcodes: 4 changed",
        "Snapshot cheatcodes",
      ),
      { changed: 4, added: 0, removed: 0 },
    );
  });

  it("returns null when the section printed nothing", () => {
    assert.equal(
      parseGasSectionCounts("Snapshot check passed", "Function gas snapshots"),
      null,
    );
  });

  it("does not read a no-baseline header as zero differences", () => {
    // "no snapshot found" arrives on the same header line, and it means
    // nothing was compared — not that nothing differed.
    assert.equal(
      parseGasSectionCounts(
        "Function gas snapshots: no snapshot found. Run your tests with --snapshot to create one.",
        "Function gas snapshots",
      ),
      null,
    );
  });
});

describe("gasProbeVerdict", () => {
  // The decision F1 exists to make. Every branch refuses a claim the check's
  // exit code alone would have made.
  function observed(
    overrides: Partial<GasProbeObservations> = {},
  ): GasProbeObservations {
    return {
      writeExitCode: 0,
      writePrintedSummary: true,
      baselineEntries: 40,
      baselineCheatcodeFiles: 3,
      checkPrintedSummary: true,
      checkFailing: 0,
      functionGas: null,
      snapshotCheatcodes: null,
      functionGasNoBaseline: false,
      snapshotCheatcodesNoBaseline: false,
      checkReportedPassed: true,
      checkReportedFailed: false,
      ...overrides,
    };
  }

  it("matches only when the check itself reported a pass", () => {
    const verdict = gasProbeVerdict(observed());
    assert.deepEqual(verdict, { state: "matched", reason: "gas-identical" });
  });

  it("diverges when the check itself reported a failure", () => {
    const verdict = gasProbeVerdict(
      observed({
        checkReportedPassed: false,
        checkReportedFailed: true,
        functionGas: { changed: 7, added: 0, removed: 0 },
      }),
    );
    assert.deepEqual(verdict, { state: "diverged", reason: "gas-differences" });
  });

  it("separates a failed control build from failed control tests", () => {
    assert.equal(
      gasProbeVerdict(
        observed({ writeExitCode: 1, writePrintedSummary: false }),
      ).reason,
      "control-build-failed",
    );
    assert.equal(
      gasProbeVerdict(observed({ writeExitCode: 1, writePrintedSummary: true }))
        .reason,
      "control-tests-failed",
    );
  });

  it("is inconclusive when the control wrote no baseline", () => {
    // The plugin writes the baseline only when the control's tests passed, so
    // a green exit does not imply a baseline exists.
    for (const empty of [null, 0]) {
      const verdict = gasProbeVerdict(
        observed({ baselineEntries: empty, baselineCheatcodeFiles: empty }),
      );
      assert.deepEqual(verdict, {
        state: "inconclusive",
        reason: "no-measurements",
      });
    }
  });

  it("accepts a run measured only by snapshot cheatcodes", () => {
    // A suite can produce cheatcode baselines and no function-gas ones, and
    // that is still something the check compared against.
    const verdict = gasProbeVerdict(
      observed({ baselineEntries: 0, baselineCheatcodeFiles: 20 }),
    );
    assert.deepEqual(verdict, { state: "matched", reason: "gas-identical" });
  });

  it("is inconclusive when the solx build never printed a summary", () => {
    assert.equal(
      gasProbeVerdict(observed({ checkPrintedSummary: false })).reason,
      "solx-build-failed",
    );
  });

  it("is inconclusive when the solx tests failed", () => {
    // The plugin skips the comparison entirely in that case, and the run
    // still exits non-zero from the test failures.
    const verdict = gasProbeVerdict(
      observed({ checkFailing: 3, checkReportedPassed: false }),
    );
    assert.deepEqual(verdict, {
      state: "inconclusive",
      reason: "solx-tests-failed",
    });
  });

  it("is inconclusive when both sections lacked a baseline", () => {
    // checkFunctionGasSnapshots passes vacuously when the run produced
    // nothing to measure, so a pass here means nothing was compared.
    const verdict = gasProbeVerdict(
      observed({
        functionGasNoBaseline: true,
        snapshotCheatcodesNoBaseline: true,
      }),
    );
    assert.deepEqual(verdict, {
      state: "inconclusive",
      reason: "no-measurements",
    });
  });

  it("does not discard one section's result for the other's missing baseline", () => {
    const verdict = gasProbeVerdict(
      observed({
        functionGas: { changed: 9, added: 0, removed: 0 },
        snapshotCheatcodesNoBaseline: true,
        checkReportedPassed: false,
        checkReportedFailed: true,
      }),
    );
    assert.deepEqual(verdict, { state: "diverged", reason: "gas-differences" });
  });

  it("refuses to call a different measured population identical gas", () => {
    // The check passes on added/removed alone. That is two runs measuring
    // different sets of functions, not two compilers agreeing on gas.
    const verdict = gasProbeVerdict(
      observed({ functionGas: { changed: 0, added: 7, removed: 412 } }),
    );
    assert.deepEqual(verdict, {
      state: "inconclusive",
      reason: "measurement-population-differs",
    });
  });

  it("is inconclusive when the check printed neither pass nor fail", () => {
    const verdict = gasProbeVerdict(
      observed({ checkReportedPassed: false, checkReportedFailed: false }),
    );
    assert.deepEqual(verdict, {
      state: "inconclusive",
      reason: "check-did-not-report",
    });
  });
});

describe("buildReproInconclusiveReason", () => {
  it("compares two successful compiles", () => {
    assert.equal(buildReproInconclusiveReason([0, 0], [0, 0], 120), null);
  });

  it("refuses to compare when a compile failed", () => {
    // Two failed builds produce two empty artifact sets whose hashes are
    // equal, which would publish a failed compile as evidence of determinism.
    assert.match(
      buildReproInconclusiveReason([0, 0], [1, 1], 0) ?? "",
      /compile 1 exited 1; compile 2 exited 1/,
    );
  });

  it("refuses to compare when a clean failed", () => {
    assert.match(
      buildReproInconclusiveReason([0, 137], [0, 0], 120) ?? "",
      /clean 2 exited 137/,
    );
  });

  it("refuses to compare an empty first compile even when both exited 0", () => {
    assert.match(
      buildReproInconclusiveReason([0, 0], [0, 0], 0) ?? "",
      /no artifacts/,
    );
  });
});

describe("collectInventory walk caveats", () => {
  it("records the directories the depth cap refused to enter", () => {
    // The cap is 10 from the project dir. A tree below it is missed, and an
    // absence that was never looked at is not evidence.
    const deep = Array.from({ length: 14 }, (_, i) => `d${i}`).join("/");
    const root = makeProject({
      "artifacts/build-info/x.json": SUBJECT_BUILD_INFO_FILE,
      "artifacts/src/A.sol/A.json": artifact("src/A.sol", "A"),
      [`${deep}/build-info/y.json`]: SUBJECT_BUILD_INFO_FILE,
    });
    const result = collectInventory(root, 0);
    assert.ok(result.truncatedAt.length > 0);
    assert.match(result.truncatedAt.join(" "), /d10/);
    // The reachable artifacts are still collected.
    assert.deepEqual(
      result.entries.map((e) => e.id),
      ["src/A.sol:A"],
    );
  });

  it("records a path it could not stat", () => {
    const root = makeProject({
      "artifacts/build-info/x.json": SUBJECT_BUILD_INFO_FILE,
      "artifacts/src/A.sol/A.json": artifact("src/A.sol", "A"),
    });
    symlinkSync(
      path.join(root, "artifacts/does-not-exist.json"),
      path.join(root, "artifacts/dangling.json"),
    );
    const result = collectInventory(root, 0);
    assert.equal(result.artifactCount, 1);
    assert.equal(result.unreadable.length, 1);
    assert.match(result.unreadable[0], /dangling\.json/);
  });
});

// ---------------------------------------------------------------------------
// Report rendering
// ---------------------------------------------------------------------------

function pairRecord(overrides: Partial<PairRecord> = {}): PairRecord {
  const solx = run();
  const control = run({ side: "control" });
  return {
    scenarioId: "ens-verifiable-factory-solx",
    runner: "solidity",
    pair: "solx-0.1.8-vs-default",
    solxProfile: "solx-0.1.8",
    controlProfile: "default",
    repetition: 1,
    repetitions: 1,
    fuzzSeed: "0x01",
    verdict: "pass",
    verdictDetail: "",
    solx,
    control,
    solxOnlyFailures: [],
    bothFailures: [],
    sharedFailureDiffs: [],
    controlOnlyFailures: [],
    eip170Failures: [],
    inventoryComparison: COMPARABLE,
    determinism: [],
    compileErrorMarker: { solx: false, control: false },
    resourceLimited: false,
    gasSnapshot: null,
    buildRepro: null,
    timestamp: "2026-08-21T00:00:00.000Z",
    ...overrides,
  };
}

describe("renderMarkdown", () => {
  it("scopes the EIP-170 table to non-test sources", () => {
    // The published number must not attribute a test-harness contract to
    // either compiler: the test runner deploys those with the limit lifted.
    const { entries: _entries, ...inventory } = inv([
      entry("src/A.sol:A", 20000),
      entry("test/Huge.t.sol:HugeTest", 200000),
    ]);
    const markdown = renderMarkdown(
      [pairRecord({ solx: run({ inventory }) })],
      "0.1.8",
    );
    const row = markdown
      .split("\n")
      .find(
        (line) =>
          line.includes("ens-verifiable-factory-solx") &&
          line.includes("20000 B"),
      );
    assert.ok(row !== undefined, "expected a size row scoped to src/A.sol");
    // The harness contract appears only in the exempt column.
    assert.match(row, /200000 B \|$/);
    assert.match(markdown, /exempt from the/);
  });

  it("says a test-harness column of none rather than 0 B", () => {
    const markdown = renderMarkdown([pairRecord()], "0.1.8");
    const row = markdown.split("\n").find((line) => line.includes("| 500 B |"));
    assert.ok(row !== undefined);
    assert.match(row, /none \|$/);
  });

  it("keeps a detail block for a passing row whose walk was truncated", () => {
    // A pass computed over a set the walk could not fully read is the shape
    // this harness refuses everywhere else.
    const { entries: _entries, ...inventory } = inv(
      [entry("src/A.sol:A", 500)],
      { truncatedAt: ["deep/nested/tree"] },
    );
    const markdown = renderMarkdown(
      [pairRecord({ solx: run({ inventory }) })],
      "0.1.8",
    );
    assert.match(markdown, /## Details/);
    assert.match(markdown, /solx inventory caveats/);
    assert.match(markdown, /deep\/nested\/tree/);
  });

  it("omits the details section for a spotless pass", () => {
    const markdown = renderMarkdown([pairRecord()], "0.1.8");
    assert.equal(markdown.includes("## Details"), false);
  });

  it("renders a gas row's state and reason rather than its exit code", () => {
    const markdown = renderMarkdown(
      [
        pairRecord({
          gasSnapshot: {
            writeExitCode: 0,
            checkExitCode: 1,
            state: "inconclusive",
            reason: "solx-tests-failed",
            baseline: {
              gasSnapshotEntries: 40,
              snapshotCheatcodeFiles: null,
              recreated: true,
            },
            functionGas: null,
            snapshotCheatcodes: null,
            divergingMeasurements: null,
            diffSample: [],
            removedBeforeWrite: [],
            trackedRestored: [],
            writeLogFile: "logs/w.log",
            checkLogFile: "logs/c.log",
          },
        }),
      ],
      "0.1.8",
    );
    assert.match(markdown, /inconclusive \| solx-tests-failed/);
    assert.equal(markdown.includes("DIVERGED"), false);
  });

  it("renders an inconclusive build-determinism row with its reason", () => {
    const markdown = renderMarkdown(
      [
        pairRecord({
          buildRepro: {
            firstHash: "a",
            secondHash: "a",
            identical: null,
            inconclusiveReason: "compile 1 exited 1; compile 2 exited 1",
            cleanExitCodes: [0, 0],
            compileExitCodes: [1, 1],
            artifactCount: 0,
            secondArtifactCount: 0,
            differingContracts: [],
          },
        }),
      ],
      "0.1.8",
    );
    assert.match(markdown, /inconclusive \| compile 1 exited 1/);
    // Two empty builds hash equal; the table must not print that as "yes".
    const reproRow = markdown
      .split("\n")
      .find((line) => line.includes("compile 1 exited 1"));
    assert.equal(reproRow?.includes("| yes |"), false);
  });

  it("renders a record written before the probes existed", () => {
    // The evidence dir holds 0.1.7 records with no gasSnapshot, no buildRepro
    // and no inventory. A crash here would discard a report for results that
    // are already on disk.
    const legacy = pairRecord();
    delete (legacy as Partial<PairRecord>).gasSnapshot;
    delete (legacy as Partial<PairRecord>).buildRepro;
    delete (legacy as Partial<PairRecord>).sharedFailureDiffs;
    const markdown = renderMarkdown([legacy], "0.1.8");
    assert.match(markdown, /ens-verifiable-factory-solx/);
    // No gas or determinism section, since neither probe ran.
    assert.equal(markdown.includes("## Gas snapshot check"), false);
    assert.equal(markdown.includes("## Build determinism"), false);
  });

  it("renders a record written before the inventory was scoped", () => {
    const legacy = pairRecord();
    const { subjectBuildInfoCount: _dropped, ...preScoping } =
      legacy.solx.inventory;
    const markdown = renderMarkdown(
      [
        {
          ...legacy,
          solx: { ...legacy.solx, inventory: preScoping as never },
        },
      ],
      "0.1.8",
    );
    assert.match(markdown, /pre-scoping record/);
  });

  it("says a shared failure was not compared when a side is missing it", () => {
    const markdown = renderMarkdown(
      [
        pairRecord({
          verdict: "pass",
          bothFailures: ["T#a"],
          sharedFailureDiffs: [
            {
              id: "T#a",
              found: { solx: false, control: false },
              identicalRaw: null,
              prefixOnly: false,
            },
          ],
        }),
      ],
      "0.1.8",
    );
    assert.match(markdown, /NOT COMPARED/);
    assert.match(markdown, /missing on both sides/);
  });
});

describe("installedVersion", () => {
  // The 0.1.8 sweep's environment captures recorded null for
  // @nomicfoundation/edr, a transitive dependency under pnpm's isolated
  // layout. These pin each layout the corpus actually presents.
  it("reads a flat node_modules layout", () => {
    const root = makeProject({
      "node_modules/pkg/package.json": { name: "pkg", version: "1.2.3" },
    });
    assert.equal(installedVersion(root, "pkg"), "1.2.3");
  });

  it("walks up to a hoisted dependency", () => {
    // graph-horizon's shape: the project dir is a workspace package and the
    // dependency is installed at the clone root.
    const root = makeProject({
      "node_modules/pkg/package.json": { name: "pkg", version: "4.5.6" },
      "packages/inner/package.json": { name: "inner", version: "0.0.0" },
    });
    assert.equal(
      installedVersion(path.join(root, "packages/inner"), "pkg"),
      "4.5.6",
    );
  });

  it("finds a transitive package reachable only through pnpm's store", () => {
    // No node_modules/<pkg> symlink exists, so nothing resolves it from the
    // project dir. This is the @nomicfoundation/edr case.
    const root = makeProject({
      "node_modules/.pnpm/@scope+pkg@1.2.3/node_modules/@scope/pkg/package.json":
        { name: "@scope/pkg", version: "1.2.3" },
    });
    assert.equal(installedVersion(root, "@scope/pkg"), "1.2.3");
  });

  it("reports every version when the store holds more than one", () => {
    // Different dependents can pull different ranges. Picking one would report
    // a transitive copy as the version in use, so an ambiguous answer reads as
    // ambiguous.
    const root = makeProject({
      "node_modules/.pnpm/pkg@1.0.0/node_modules/pkg/package.json": {
        name: "pkg",
        version: "1.0.0",
      },
      "node_modules/.pnpm/pkg@2.0.0/node_modules/pkg/package.json": {
        name: "pkg",
        version: "2.0.0",
      },
    });
    assert.equal(installedVersion(root, "pkg"), "1.0.0, 2.0.0");
  });

  it("reads the store's real manifest, not the directory name", () => {
    // A directory name is not evidence: this one disagrees with the manifest
    // inside it, and the manifest wins.
    const root = makeProject({
      "node_modules/.pnpm/pkg@9.9.9/node_modules/pkg/package.json": {
        name: "pkg",
        version: "3.0.0",
      },
    });
    assert.equal(installedVersion(root, "pkg"), "3.0.0");
  });

  it("prefers the resolvable dependency over a stale store copy", () => {
    const root = makeProject({
      "node_modules/pkg/package.json": { name: "pkg", version: "5.0.0" },
      "node_modules/.pnpm/pkg@1.0.0/node_modules/pkg/package.json": {
        name: "pkg",
        version: "1.0.0",
      },
    });
    assert.equal(installedVersion(root, "pkg"), "5.0.0");
  });

  it("finds a workspace package's store at the repo root", () => {
    // graph-horizon's real shape: it runs in packages/horizon and the pnpm
    // store is two levels up. This is the case that still read null after the
    // first version of this fix.
    const root = makeProject({
      "node_modules/.pnpm/@scope+pkg@7.7.7/node_modules/@scope/pkg/package.json":
        { name: "@scope/pkg", version: "7.7.7" },
      "packages/inner/package.json": { name: "inner", version: "0.0.0" },
    });
    assert.equal(
      installedVersion(path.join(root, "packages/inner"), "@scope/pkg"),
      "7.7.7",
    );
  });

  it("returns null when the package is absent", () => {
    assert.equal(installedVersion(makeProject({}), "nope"), null);
  });
});
