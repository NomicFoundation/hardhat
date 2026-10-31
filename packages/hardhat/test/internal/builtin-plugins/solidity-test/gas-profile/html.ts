import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CallKind } from "@nomicfoundation/edr";

import {
  escapeHtml,
  REPORT_ISOLATION_NOTE,
  renderReport,
} from "../../../../../src/internal/builtin-plugins/solidity-test/gas-profile/html.js";
import { collectGasProfiles } from "../../../../../src/internal/builtin-plugins/solidity-test/gas-profile/index.js";
import {
  createCall,
  createFuzzTestResult,
  createUnitTestResult,
  depositTestResult,
  recursionTestResult,
  swapManyTimesTestResult,
} from "../../../../helpers/gas-profile.js";
import { createSuiteResult } from "../../gas-analytics/suite-result-helpers.js";

const INFO = { hardhatVersion: "3.0.0", edrVersion: "0.1.0", isolation: false };

function tests() {
  return collectGasProfiles([
    createSuiteResult("GasTest", [
      depositTestResult(),
      createFuzzTestResult("testFuzz(uint256)"),
    ]),
    createSuiteResult("DexTest", [swapManyTimesTestResult()]),
    createSuiteResult("Evil", [
      createUnitTestResult("test_x()", 2_000, [
        createCall({
          contract: "Evil",
          fn: "test_x",
          gasUsed: 2_000,
          children: [
            createCall({
              contract: "<script>alert(1)</script>",
              fn: "f'\"&",
              gasUsed: 1_000,
            }),
          ],
        }),
      ]),
    ]),
  ]);
}

function render(isolation = false): string {
  const { profiles, unprofiled } = tests();
  return renderReport(profiles, unprofiled, { ...INFO, isolation });
}

describe("gas-profile/html", () => {
  it("escapes all text and has no script", () => {
    const html = render();

    assert.ok(!/<script/i.test(html), "the report must not contain a script");
    assertIncludes(
      html,
      "&lt;script&gt;alert(1)&lt;/script&gt;.f&#39;&quot;&amp;",
    );
    assert.equal(
      escapeHtml(`<a href="x">'&'</a>`),
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;",
    );
  });

  it("describes each graph with a figure and its caption", () => {
    const html = render();

    assert.equal(html.match(/<figure /g)?.length, 3);
    assert.equal(html.match(/<figcaption>/g)?.length, 3);
    assertIncludes(html, '<html lang="en">');
    assertIncludes(html, "prefers-color-scheme:dark");
  });

  it("sorts the index by test gas and lists unprofiled tests", () => {
    const html = render();

    const order = [
      "DexTest#<wbr>",
      "GasTest#<wbr>",
      "Evil#<wbr>",
      "GasTest#<wbr>testFuzz",
    ].map((name) => html.indexOf(name));
    assert.deepEqual(
      [...order].sort((a, b) => a - b),
      order,
    );
    assertIncludes(html, "fuzz and invariant tests aren&#39;t profiled");
  });

  it("shows per-call gas from outermost calls, and recursion once", () => {
    const { profiles, unprofiled } = collectGasProfiles([
      createSuiteResult("T", [recursionTestResult(200)]),
      createSuiteResult("DexTest", [swapManyTimesTestResult()]),
    ]);
    const html = renderReport(profiles, unprofiled, INFO);

    assertIncludes(html, '30,474<span class="range">17,934–80,634</span>');
    assertIncludes(
      html,
      '<td data-label="Total gas">20,100</td><td data-label="Calls">201</td>',
    );
  });

  it("states isolation in the header and the notes", () => {
    const plain = render();
    assert.ok(!plain.includes("Isolation is on"), "expected no isolation note");
    assertIncludes(plain, "gas was refunded");

    const html = render(true);
    assertIncludes(html, escapeHtml(REPORT_ISOLATION_NOTE));
    assertIncludes(html, "The refund can&#39;t be separated under isolation");
    // Under isolation the refund isn't presented as a reliable figure.
    assert.ok(!html.includes("gas was refunded"), "expected no refund note");
    assert.ok(!html.includes(" refunded<a"), "expected no refund figure");
  });

  it("explains the folded-stacks escaping", () => {
    assertIncludes(render(), "<code>a;b</code> is <code>a%3bb</code>");
  });

  it("notes a test gas higher than the trace's gas", () => {
    const { profiles } = collectGasProfiles([
      createSuiteResult("T", [
        createUnitTestResult("test_x()", 1_200, [
          createCall({
            contract: "T",
            fn: "test_x",
            gasUsed: 1_000,
            children: [
              createCall({
                gasUsed: 6_900,
                kind: CallKind.StaticCall,
                address: "0x0000000000000000000000000000000000000100",
                rawInputs: new Uint8Array(160),
              }),
            ],
          }),
        ]),
      ]),
    ]);
    const html = renderReport(profiles, [], INFO);

    assertIncludes(html, "is 200 more than the trace&#39;s executed gas");
    assertIncludes(html, "precompile");
  });
});

function assertIncludes(text: string, part: string): void {
  assert.ok(text.includes(part), `expected the output to include ${part}`);
}
