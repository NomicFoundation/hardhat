import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { collectGasProfiles } from "../../../../../src/internal/builtin-plugins/solidity-test/gas-profile/index.js";
import {
  ISOLATION_NOTE,
  renderSummary,
  shorten,
} from "../../../../../src/internal/builtin-plugins/solidity-test/gas-profile/summary.js";
import {
  createCall,
  createFuzzTestResult,
  createUnitTestResult,
  depositTestResult,
  swapManyTimesTestResult,
} from "../../../../helpers/gas-profile.js";
import { createSuiteResult } from "../../gas-analytics/suite-result-helpers.js";

function tests() {
  return collectGasProfiles([
    createSuiteResult("GasTest", [
      depositTestResult(),
      createFuzzTestResult("testFuzz(uint256)"),
    ]),
    createSuiteResult("DexTest", [swapManyTimesTestResult()]),
  ]);
}

describe("gas-profile/summary", () => {
  it("prints the heaviest tests, functions and hottest paths", () => {
    const { profiles, unprofiled } = tests();
    const summary = renderSummary(profiles, unprofiled, false);

    assertIncludes(summary, "Tests by gas (top 2 of 2)");
    assertIncludes(summary, "Router.swapExact ×5");
    assertIncludes(summary, "Vault.deposit");
    assertIncludes(summary, "Router.swapExact ×5 90.6% → Pool.swap ×5");
    assertIncludes(
      summary,
      "GasTest#testFuzz: fuzz and invariant tests aren't profiled",
    );
    assert.ok(!summary.includes(ISOLATION_NOTE), "expected no isolation note");
  });

  it("shortens long names in the tables", () => {
    const long = `test_${"x".repeat(100)}`;
    const { profiles, unprofiled } = collectGasProfiles([
      createSuiteResult("T", [
        createUnitTestResult(`${long}()`, 100, [
          createCall({ contract: "T", fn: long, gasUsed: 100 }),
        ]),
      ]),
    ]);
    const summary = renderSummary(profiles, unprofiled, false);

    assert.equal([...shorten(`T#${long}`)].length, 60);
    assertIncludes(summary, shorten(`T#${long}`));
    assert.ok(!summary.includes(long), "expected the long name to be cut");
    assert.equal(shorten("T#short"), "T#short");
  });

  it("says when isolation is on", () => {
    const { profiles, unprofiled } = tests();

    assertIncludes(renderSummary(profiles, unprofiled, true), ISOLATION_NOTE);
  });

  it("warns when the test gas is higher than the trace's gas", () => {
    const odd = collectGasProfiles([
      createSuiteResult("T", [
        createUnitTestResult(
          "test_x()",
          50_000,
          depositTestResult().callTraces(),
        ),
      ]),
    ]);
    assertIncludes(
      renderSummary(odd.profiles, odd.unprofiled, false),
      "T#test_x (+5,806)",
    );
  });
});

function assertIncludes(text: string, part: string): void {
  assert.ok(text.includes(part), `expected the output to include ${part}`);
}
