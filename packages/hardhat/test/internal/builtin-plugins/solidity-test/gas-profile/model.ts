import type {
  Frame,
  TestProfile,
} from "../../../../../src/internal/builtin-plugins/solidity-test/gas-profile/model.js";
import type { CallTrace, TestResult } from "@nomicfoundation/edr";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CallKind, TestStatus } from "@nomicfoundation/edr";

import {
  escapeFoldedFrame,
  isProfiled,
  profileTest,
} from "../../../../../src/internal/builtin-plugins/solidity-test/gas-profile/model.js";
import {
  createCall,
  createCreate,
  createFuzzTestResult,
  createUnitTestResult,
  depositTestResult,
  recursionTestResult,
  swapManyTimesTestResult,
} from "../../../../helpers/gas-profile.js";

function profile(suite: string, testResult: TestResult): TestProfile {
  const result = profileTest(suite, testResult);
  assert.ok(isProfiled(result), "expected the test to be profiled");
  return result;
}

/** Profiles a test whose root `T.test_x` makes the given calls. */
function profileCalls(
  rootGas: number,
  calls: CallTrace[],
  consumedGas = rootGas,
): TestProfile {
  return profile(
    "T",
    createUnitTestResult("test_x()", consumedGas, [
      createCall({
        contract: "T",
        fn: "test_x",
        gasUsed: rootGas,
        children: calls,
      }),
    ]),
  );
}

function child(frame: Frame, name: string): Frame {
  const found = frame.children.find((c) => c.name === name);
  assert.ok(found !== undefined, `expected a ${name} frame`);
  return found;
}

function foldedSum(test: TestProfile): number {
  return test.folded.reduce(
    (sum, line) => sum + Number(line.slice(line.lastIndexOf(" ") + 1)),
    0,
  );
}

describe("gas-profile/model", () => {
  it("reproduces the measured test_deposit numbers", () => {
    const test = profile("GasTest", depositTestResult());

    assert.equal(test.fullName, "GasTest#test_deposit");
    assert.equal(test.outcome, "passed");
    assert.equal(test.executed, 44_194);
    assert.equal(test.testGas, 41_394);
    assert.equal(test.refund, 2_800);
    assert.equal(test.unaccounted, 0);
    assert.equal(test.root.self, 6_322);
    const deposit = child(test.root, "Vault.deposit");
    assert.equal(deposit.total, 37_071);
    assert.equal(deposit.self, 30_437);
    assert.equal(child(deposit, "Token.transfer").self, 6_634);
    assert.equal(test.calls, 3);
    // setUp is left out, so its creates don't appear.
    assert.equal(test.hasCreate, false);
  });

  it("writes folded lines in execution order that sum to the root gas", () => {
    const test = profile("GasTest", depositTestResult());

    assert.deepEqual(test.folded, [
      "GasTest.test_deposit 6322",
      "GasTest.test_deposit;Vault.deposit 30437",
      "GasTest.test_deposit;Vault.deposit;Token.transfer 6634",
      "GasTest.test_deposit;Vault.shares 801",
    ]);
    assert.equal(foldedSum(test), test.executed);
  });

  it("merges repeated calls and keeps the lightest and heaviest call", () => {
    const test = profile("DexTest", swapManyTimesTestResult());

    const router = child(test.root, "Router.swapExact");
    assert.equal(router.count, 5);
    assert.equal(router.total, 80_634 + 4 * 17_934);
    assert.equal(router.minCall, 17_934);
    assert.equal(router.maxCall, 80_634);
    assert.equal(test.root.self, 15_838);
    assert.equal(test.refund, 0);
    assert.equal(foldedSum(test), test.executed);
    assert.equal(test.folded.length, 1 + 5 * 4);

    const row = test.table.find((r) => r.name === "Router.swapExact");
    assert.ok(row !== undefined, "expected a Router.swapExact row");
    assert.equal(row.calls, 5);
    assert.equal(row.outerCalls, 5);
    assert.equal(row.minCall, 17_934);
    assert.equal(row.maxCall, 80_634);
    assert.deepEqual(
      test.hottest.map((f) => f.name),
      ["Router.swapExact", "Pool.swap"],
    );
  });

  it("handles more calls than fit in a function's arguments", () => {
    const calls = 150_000;
    const test = profileCalls(
      calls * 10 + 1,
      Array.from({ length: calls }, (_, i) =>
        createCall({ contract: "A", fn: "f", gasUsed: i === 0 ? 100 : 10 }),
      ),
      calls * 10 + 1,
    );

    const f = child(test.root, "A.f");
    assert.equal(f.count, calls);
    assert.equal(f.minCall, 10);
    assert.equal(f.maxCall, 100);
    assert.equal(test.folded.length, calls + 1);
  });

  it("counts a recursive function's gas once, at its outermost call", () => {
    const test = profile("T", recursionTestResult(200));

    const row = test.table.find((r) => r.name === "Rec.down");
    assert.ok(row !== undefined, "expected a Rec.down row");
    assert.equal(row.calls, 201);
    assert.equal(row.outerCalls, 1);
    assert.equal(row.total, 100 * 201);
    assert.equal(row.self, 100 * 201);
    assert.equal(row.minCall, 100 * 201);
    assert.equal(foldedSum(test), test.executed);
  });

  it("drops cheatcode and console.log calls, and keeps precompiles", () => {
    const test = profileCalls(23_200, [
      createCall({ contract: "VM", fn: "warp", gasUsed: 0, isCheatcode: true }),
      createCall({ contract: "Token", fn: "mint", gasUsed: 5_895 }),
      createCall({
        contract: "PRECOMPILES",
        fn: "sha256",
        gasUsed: 72,
        kind: CallKind.StaticCall,
        address: "0x0000000000000000000000000000000000000002",
      }),
      createCall({
        contract: "console",
        fn: "log",
        gasUsed: 0,
        kind: CallKind.StaticCall,
        address: "0x000000000000000000636F6e736F6c652e6c6f67",
      }),
    ]);

    assert.deepEqual(
      test.root.children.map((c) => c.name),
      ["Token.mint", "PRECOMPILES.sha256"],
    );
    assert.equal(child(test.root, "PRECOMPILES.sha256").role, "precompile");
    assert.deepEqual(test.dropped, ["cheatcode", "console.log"]);
    assert.equal(foldedSum(test), 23_200);
  });

  it("recognises P256VERIFY at 0x100 as a precompile, but not 0x0", () => {
    const test = profileCalls(30_000, [
      createCall({
        gasUsed: 6_900,
        kind: CallKind.StaticCall,
        address: "0x0000000000000000000000000000000000000100",
        rawInputs: new Uint8Array(160),
      }),
      createCall({
        gasUsed: 2_600,
        address: "0x0000000000000000000000000000000000000000",
        rawInputs: new Uint8Array(0),
      }),
    ]);

    const [p256, zero] = test.root.children;
    assert.equal(p256.role, "precompile");
    assert.equal(zero.role, "unknown");
    assert.equal(zero.name, "0x0000…0000.fallback");
  });

  it("names undecoded calls by selector, fallback or receive", () => {
    const test = profileCalls(10_000, [
      createCall({
        gasUsed: 5_000,
        rawInputs: new Uint8Array([0xa9, 0x05, 0x9c, 0xbb, 0x01]),
      }),
      createCall({
        contract: "Wallet",
        gasUsed: 3_000,
        value: 1n,
        rawInputs: new Uint8Array(0),
      }),
      createCall({
        contract: "Wallet",
        gasUsed: 1_000,
        rawInputs: new Uint8Array([0x01]),
      }),
    ]);

    assert.deepEqual(
      test.root.children.map((c) => c.name),
      ["0x5fbd…0aa3.0xa9059cbb", "Wallet.receive", "Wallet.fallback"],
    );
    assert.equal(test.root.children[0].role, "unknown");
  });

  it("marks failed calls, names failed creates and groups tiny frames", () => {
    const test = profileCalls(345_607, [
      createCreate("Worker", 136_781),
      createCall({
        contract: "Worker",
        fn: "workThenRevert",
        gasUsed: 31_943,
        success: false,
      }),
      createCall({
        contract: "Worker",
        fn: "invalidOp",
        gasUsed: 156,
        success: false,
      }),
      createCall({
        contract: "Worker",
        fn: "burn",
        gasUsed: 60_000,
        success: false,
      }),
      createCreate(undefined, 336, false),
    ]);

    assert.equal(test.hasFailedFrame, true);
    assert.equal(test.hasCreate, true);
    assert.ok(child(test.root, "Worker.burn").failed, "expected burn to fail");
    const group = child(test.root, "+2 small calls");
    assert.equal(group.total, 156 + 336);
    assert.deepEqual(
      group.grouped.map((f) => f.name),
      ["new <unknown>", "Worker.invalidOp"],
    );
    // The table and the folded lines keep the grouped frames.
    assert.ok(
      test.table.some((r) => r.name === "new <unknown>"),
      "expected the failed create in the table",
    );
    assert.ok(
      test.folded.includes("T.test_x;new <unknown> 336"),
      "expected the failed create in the folded lines",
    );
  });

  it("clamps a negative self gas to 0 and reports it", () => {
    const test = profileCalls(100, [
      createCall({ contract: "A", fn: "f", gasUsed: 150 }),
    ]);

    assert.equal(test.root.self, 0);
    assert.equal(test.root.clamped, true);
    assert.deepEqual(test.clamped, ["T.test_x"]);
  });

  it("never reports a negative refund", () => {
    const test = profileCalls(1_000, [], 1_200);

    assert.equal(test.refund, 0);
    assert.equal(test.unaccounted, 200);
  });

  it("escapes the folded separators in frame names", () => {
    assert.equal(escapeFoldedFrame("a;b%c\nd"), "a%3bb%25c%0ad");
    const test = profileCalls(10, [
      createCall({ contract: "Odd;Name%", fn: "f", gasUsed: 5 }),
    ]);
    assert.equal(test.folded[1], "T.test_x;Odd%3bName%25.f 5");
  });

  it("explains why a test isn't profiled", () => {
    const outcome = (testResult: TestResult) => {
      const result = profileTest("T", testResult);
      assert.ok(!isProfiled(result), "expected the test not to be profiled");
      return [result.outcome, result.reason];
    };

    assert.deepEqual(outcome(createFuzzTestResult("testFuzz(uint256)")), [
      "passed",
      "fuzz and invariant tests aren't profiled",
    ]);
    assert.deepEqual(outcome(createUnitTestResult("test_a()", 0, [])), [
      "passed",
      "no trace was recorded",
    ]);
    // A skipped test can have a partial trace; it's still not profiled.
    const partial = createCall({ contract: "T", fn: "test_b", gasUsed: 10 });
    assert.deepEqual(
      outcome(
        createUnitTestResult("test_b()", 10, [partial], TestStatus.Skipped),
      ),
      ["skipped", "skipped"],
    );
    const setUp = createCall({ contract: "T", fn: "setUp", gasUsed: 10 });
    assert.deepEqual(
      outcome(createUnitTestResult("test_c()", 0, [setUp], TestStatus.Failure)),
      ["failed", "only setUp ran"],
    );
  });
});
