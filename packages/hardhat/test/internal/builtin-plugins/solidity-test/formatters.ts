import type {
  InlineConfigDirectiveProblem,
  TestSourceError,
  TestSourceFileProblem,
} from "@nomicfoundation/edr";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatTestSourceErrors } from "../../../../src/internal/builtin-plugins/solidity-test/formatters.js";

const SOURCE_NAME = "project/test/Foo.t.sol";

const sourceNameToUserSourceName = new Map([[SOURCE_NAME, "test/Foo.t.sol"]]);

function directiveError(
  problem: InlineConfigDirectiveProblem,
): TestSourceError {
  return {
    kind: "directive",
    sourceName: SOURCE_NAME,
    contract: "FooTest",
    function: "testFuzz",
    line: 12,
    problem,
  };
}

function contractLevelDirectiveError(
  problem: InlineConfigDirectiveProblem,
): TestSourceError {
  return {
    kind: "directive",
    sourceName: SOURCE_NAME,
    contract: "FooTest",
    // A contract-level directive doesn't belong to any test function, so EDR
    // leaves this undefined.
    function: undefined,
    line: 12,
    problem,
  };
}

function sourceError(problem: TestSourceFileProblem): TestSourceError {
  return {
    kind: "source",
    sourceName: SOURCE_NAME,
    problem,
  };
}

describe("formatTestSourceErrors", () => {
  it("reports every problem in order, one per line", () => {
    const formatted = formatTestSourceErrors(
      [
        directiveError({
          kind: "InlineConfigDuplicateKey",
          key: "default.fuzz.runs",
        }),
        sourceError({
          kind: "TestSourceUnsupportedSolcVersion",
          version: "0.7.6",
        }),
      ],
      sourceNameToUserSourceName,
    );

    assert.equal(
      formatted,
      [
        `- test/Foo.t.sol:12: FooTest.testFuzz: duplicate key "default.fuzz.runs"`,
        "- test/Foo.t.sol: this source was compiled with Solidity 0.7.6, and parsing test sources requires 0.8.0 or newer",
      ].join("\n"),
    );
  });

  it("falls back to EDR's source name when there is no user-facing path for it", () => {
    const formatted = formatTestSourceErrors(
      [directiveError({ kind: "InlineConfigInvalidKey", key: "nope" })],
      new Map(),
    );

    assert.equal(
      formatted,
      `- project/test/Foo.t.sol:12: FooTest.testFuzz: invalid key "nope"`,
    );
  });

  it("names only the contract for a contract-level directive", () => {
    const formatted = formatTestSourceErrors(
      [
        contractLevelDirectiveError({
          kind: "InlineConfigDuplicateKey",
          key: "default.fuzz.runs",
        }),
      ],
      sourceNameToUserSourceName,
    );

    assert.equal(
      formatted,
      `- test/Foo.t.sol:12: FooTest: duplicate key "default.fuzz.runs"`,
    );
  });

  it("names only the contract for a contract-level directive that can't be located", () => {
    const formatted = formatTestSourceErrors(
      [
        sourceError({
          kind: "TestSourceDirectiveLocation",
          contract: "FooTest",
          function: undefined,
          reason: "offset out of bounds",
        }),
      ],
      sourceNameToUserSourceName,
    );

    assert.equal(
      formatted,
      "- test/Foo.t.sol: a directive of FooTest could not be located: offset out of bounds",
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
          profile: "ci",
          declaredProfiles: ["default", "lite"],
        },
        `undeclared profile "ci". Declared profiles: "default", "lite"`,
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
        formatTestSourceErrors(
          [directiveError(problem)],
          sourceNameToUserSourceName,
        ),
        `- test/Foo.t.sol:12: FooTest.testFuzz: ${expected}`,
        `Unexpected message for ${problem.kind}`,
      );
    }
  });

  it("lists the parse errors of a source that doesn't parse, one per line", () => {
    const formatted = formatTestSourceErrors(
      [
        sourceError({
          kind: "TestSourceParseErrors",
          reasons: ["12: expected `;`", "40: unexpected `}`"],
        }),
      ],
      sourceNameToUserSourceName,
    );

    assert.equal(
      formatted,
      [
        "- test/Foo.t.sol: the source could not be parsed:",
        "    12: expected `;`",
        "    40: unexpected `}`",
      ].join("\n"),
    );
  });

  it("describes every source problem", () => {
    const problems: Array<[TestSourceFileProblem, string]> = [
      [
        { kind: "TestSourceUnsupportedSolcVersion", version: "0.6.12" },
        "this source was compiled with Solidity 0.6.12, and parsing test sources requires 0.8.0 or newer",
      ],
      [
        {
          kind: "TestSourceFileNotFound",
          path: "/project/test/Foo.t.sol",
          reason: "no such file or directory",
        },
        `the source file could not be read at "/project/test/Foo.t.sol": no such file or directory`,
      ],
      [
        { kind: "TestSourcePathNotProvided" },
        "the path of this source was not provided, so it could not be parsed",
      ],
      [
        {
          kind: "TestSourceDirectiveLocation",
          contract: "FooTest",
          function: "testFuzz",
          reason: "offset out of bounds",
        },
        "a directive of FooTest.testFuzz could not be located: offset out of bounds",
      ],
    ];

    for (const [problem, expected] of problems) {
      assert.equal(
        formatTestSourceErrors(
          [sourceError(problem)],
          sourceNameToUserSourceName,
        ),
        `- test/Foo.t.sol: ${expected}`,
        `Unexpected message for ${problem.kind}`,
      );
    }
  });
});
