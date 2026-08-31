import type {
  InlineConfigDirectiveProblem,
  InlineConfigError,
  InlineConfigSourceProblem,
} from "@nomicfoundation/edr";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatInlineConfigErrors } from "../../../../src/internal/builtin-plugins/solidity-test/formatters.js";

const SOURCE_NAME = "project/test/Foo.t.sol";

const sourceNameToUserSourceName = new Map([[SOURCE_NAME, "test/Foo.t.sol"]]);

function directiveError(
  problem: InlineConfigDirectiveProblem,
): InlineConfigError {
  return {
    kind: "directive",
    sourceName: SOURCE_NAME,
    contract: "FooTest",
    function: "testFuzz",
    line: 12,
    problem,
  };
}

function sourceError(problem: InlineConfigSourceProblem): InlineConfigError {
  return {
    kind: "source",
    sourceName: SOURCE_NAME,
    problem,
  };
}

describe("formatInlineConfigErrors", () => {
  it("reports every problem in order, one per line", () => {
    const formatted = formatInlineConfigErrors(
      [
        directiveError({
          kind: "InlineConfigDuplicateKey",
          key: "default.fuzz.runs",
        }),
        sourceError({ kind: "InlineConfigInvalidSolcVersion" }),
      ],
      sourceNameToUserSourceName,
    );

    assert.equal(
      formatted,
      [
        `- test/Foo.t.sol:12: FooTest.testFuzz: duplicate key "default.fuzz.runs"`,
        "- test/Foo.t.sol: the Solidity version of this source is not supported by the inline configuration parser",
      ].join("\n"),
    );
  });

  it("falls back to EDR's source name when there is no user-facing path for it", () => {
    const formatted = formatInlineConfigErrors(
      [directiveError({ kind: "InlineConfigInvalidKey", key: "nope" })],
      new Map(),
    );

    assert.equal(
      formatted,
      `- project/test/Foo.t.sol:12: FooTest.testFuzz: invalid key "nope"`,
    );
  });

  it("describes every directive problem", () => {
    const problems: Array<[InlineConfigDirectiveProblem, string]> = [
      [
        { kind: "InlineConfigInvalidSyntax", directive: "fuzz.runs 7" },
        `missing "=" in "fuzz.runs 7"`,
      ],
      [
        {
          kind: "InlineConfigUndeclaredProfile",
          profile: "nope",
          declaredProfiles: ["ci", "default"],
        },
        `unknown profile "nope". Declared profiles: "ci", "default"`,
      ],
      [
        { kind: "InlineConfigInvalidKey", key: "default.nope" },
        `invalid key "default.nope"`,
      ],
      [
        {
          kind: "InlineConfigInvalidKeyForTestType",
          key: "default.fuzz.runs",
          testType: "invariant",
        },
        `key "default.fuzz.runs" is not valid for invariant tests`,
      ],
      [
        {
          kind: "InlineConfigInvalidValue",
          key: "default.fuzz.runs",
          value: "not-a-number",
          expected: "non-negative integer",
        },
        `invalid value "not-a-number" for key "default.fuzz.runs". Expected a non-negative integer`,
      ],
      [
        { kind: "InlineConfigDuplicateKey", key: "default.fuzz.runs" },
        `duplicate key "default.fuzz.runs"`,
      ],
    ];

    for (const [problem, expected] of problems) {
      assert.equal(
        formatInlineConfigErrors(
          [directiveError(problem)],
          sourceNameToUserSourceName,
        ),
        `- test/Foo.t.sol:12: FooTest.testFuzz: ${expected}`,
        `Unexpected message for ${problem.kind}`,
      );
    }
  });

  it("describes every source problem", () => {
    const problems: Array<[InlineConfigSourceProblem, string]> = [
      [
        { kind: "InlineConfigInvalidSolcVersion" },
        "the Solidity version of this source is not supported by the inline configuration parser",
      ],
      [
        {
          kind: "InlineConfigSourceFileNotFound",
          path: "/project/test/Foo.t.sol",
          reason: "no such file or directory",
        },
        `the source file could not be read at "/project/test/Foo.t.sol": no such file or directory`,
      ],
      [
        {
          kind: "InlineConfigDirectiveLocation",
          contract: "FooTest",
          function: "testFuzz",
          reason: "offset out of bounds",
        },
        "a directive of FooTest.testFuzz could not be located: offset out of bounds",
      ],
    ];

    for (const [problem, expected] of problems) {
      assert.equal(
        formatInlineConfigErrors(
          [sourceError(problem)],
          sourceNameToUserSourceName,
        ),
        `- test/Foo.t.sol: ${expected}`,
        `Unexpected message for ${problem.kind}`,
      );
    }
  });
});
