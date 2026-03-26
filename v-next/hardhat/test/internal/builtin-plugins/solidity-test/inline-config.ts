// cSpell:ignore aabbccdd
import type { RawInlineOverride } from "../../../../src/internal/builtin-plugins/solidity-test/inline-config.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { utf8StringToBytes } from "@nomicfoundation/hardhat-utils/bytes";

import {
  buildConfigOverride,
  buildInfoContainsInlineConfig,
  extractDocText,
  extractInlineConfigFromAst,
  getFunctionFqn,
  getTestFunctionOverrides,
  parseInlineConfigLine,
  resolveFunctionSelector,
  validateInlineOverrides,
} from "../../../../src/internal/builtin-plugins/solidity-test/inline-config.js";

describe("inline-config", () => {
  describe("getTestFunctionOverrides", () => {
    it("should return empty array when no build infos contain inline config", () => {
      const bi = makeBuildInfo(
        "test/MyTest.sol",
        "// just a comment\ncontract MyTest {}",
        {
          MyTest: {
            methodIdentifiers: { "testFoo()": "aabbccdd" },
            functions: [{ name: "testFoo", documentation: null }],
          },
        },
      );
      assert.deepEqual(getTestFunctionOverrides([bi]), []);
    });

    it("should deduplicate when same source appears in multiple build infos", () => {
      const bi1 = makeBuildInfo(
        "test/MyTest.sol",
        "/// hardhat-config: fuzz.runs = 10",
        {
          MyTest: {
            methodIdentifiers: { "testFuzz()": "aabbccdd" },
            functions: [
              {
                name: "testFuzz",
                documentation: " hardhat-config: fuzz.runs = 10",
              },
            ],
          },
        },
      );
      const bi2 = makeBuildInfo(
        "test/MyTest.sol",
        "/// hardhat-config: fuzz.runs = 10",
        {
          MyTest: {
            methodIdentifiers: { "testFuzz()": "aabbccdd" },
            functions: [
              {
                name: "testFuzz",
                documentation: " hardhat-config: fuzz.runs = 10",
              },
            ],
          },
        },
      );
      const overrides = getTestFunctionOverrides([bi1, bi2]);
      assert.equal(overrides.length, 1);
    });

    it("should produce correct ArtifactId with solcVersion", () => {
      const bi = makeBuildInfo(
        "test/MyTest.sol",
        "/// hardhat-config: fuzz.runs = 10",
        {
          MyTest: {
            methodIdentifiers: { "testFuzz()": "aabbccdd" },
            functions: [
              {
                name: "testFuzz",
                documentation: " hardhat-config: fuzz.runs = 10",
              },
            ],
          },
        },
        "0.8.20",
      );
      const overrides = getTestFunctionOverrides([bi]);
      assert.deepEqual(overrides[0].identifier.contractArtifact, {
        name: "MyTest",
        source: "test/MyTest.sol",
        solcVersion: "0.8.20",
      });
    });

    it("should throw UNRESOLVED_SELECTOR when function has no ABI entry", () => {
      const bi = makeBuildInfo(
        "test/MyTest.sol",
        "/// hardhat-config: fuzz.runs = 10",
        {
          MyTest: {
            methodIdentifiers: {},
            functions: [
              {
                name: "testHelper",
                documentation: " hardhat-config: fuzz.runs = 10",
              },
            ],
          },
        },
      );
      assertThrowsHardhatError(
        () => getTestFunctionOverrides([bi]),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS
          .INLINE_CONFIG_UNRESOLVED_SELECTOR,
        {
          functionFqn: getFunctionFqn(
            "test/MyTest.sol",
            "MyTest",
            "testHelper",
          ),
        },
      );
    });

    it("should process a basic end-to-end case", () => {
      const bi = makeBuildInfo(
        "test/MyTest.sol",
        "/// hardhat-config: fuzz.runs = 50",
        {
          MyTest: {
            methodIdentifiers: { "testFuzz()": "aabbccdd" },
            functions: [
              {
                name: "testFuzz",
                documentation: " hardhat-config: fuzz.runs = 50",
              },
            ],
          },
        },
      );
      const overrides = getTestFunctionOverrides([bi]);
      assert.equal(overrides.length, 1);
      assert.equal(overrides[0].identifier.functionSelector, "0xaabbccdd");
      assert.deepEqual(overrides[0].config, { fuzz: { runs: 50 } });
    });

    it("should merge overrides from mixed hardhat-config: and forge-config: prefixes", () => {
      const bi = makeBuildInfo(
        "test/MyTest.sol",
        "/// hardhat-config: fuzz.runs = 10\n/// forge-config: fuzz.max-test-rejects = 500",
        {
          MyTest: {
            methodIdentifiers: { "testFuzz()": "aabbccdd" },
            functions: [
              {
                name: "testFuzz",
                documentation:
                  " hardhat-config: fuzz.runs = 10\n forge-config: fuzz.max-test-rejects = 500",
              },
            ],
          },
        },
      );
      const overrides = getTestFunctionOverrides([bi]);
      assert.equal(overrides.length, 1);
      assert.deepEqual(overrides[0].config, {
        fuzz: { runs: 10, maxTestRejects: 500 },
      });
    });
  });

  describe("buildInfoContainsInlineConfig", () => {
    it("should return true when bytes contain hardhat-config:", () => {
      assert.equal(
        buildInfoContainsInlineConfig(
          utf8StringToBytes('{"content":"hardhat-config: fuzz.runs = 10"}'),
        ),
        true,
      );
    });

    it("should return true when bytes contain forge-config:", () => {
      assert.equal(
        buildInfoContainsInlineConfig(
          utf8StringToBytes('{"content":"forge-config: fuzz.runs = 10"}'),
        ),
        true,
      );
    });

    it("should return false when neither prefix is present", () => {
      assert.equal(
        buildInfoContainsInlineConfig(
          utf8StringToBytes('{"content":"just a comment"}'),
        ),
        false,
      );
    });
  });

  describe("extractInlineConfigFromAst", () => {
    it("should return empty for non-SourceUnit AST", () => {
      assert.deepEqual(
        extractInlineConfigFromAst({ nodeType: "Other" }, "test/MyTest.sol"),
        [],
      );
    });

    it("should skip non-ContractDefinition nodes", () => {
      const ast = {
        nodeType: "SourceUnit",
        nodes: [{ nodeType: "PragmaDirective" }],
      };
      assert.deepEqual(extractInlineConfigFromAst(ast, "test/MyTest.sol"), []);
    });

    it("should skip non-test and non-invariant functions", () => {
      const ast = {
        nodeType: "SourceUnit",
        nodes: [
          {
            nodeType: "ContractDefinition",
            name: "MyTest",
            nodes: [
              {
                nodeType: "FunctionDefinition",
                name: "setUp",
                documentation: {
                  nodeType: "StructuredDocumentation",
                  text: " hardhat-config: fuzz.runs = 10",
                },
              },
            ],
          },
        ],
      };
      assert.deepEqual(extractInlineConfigFromAst(ast, "test/MyTest.sol"), []);
    });

    it("should skip functions without documentation", () => {
      const ast = {
        nodeType: "SourceUnit",
        nodes: [
          {
            nodeType: "ContractDefinition",
            name: "MyTest",
            nodes: [
              {
                nodeType: "FunctionDefinition",
                name: "testFoo",
                documentation: null,
              },
            ],
          },
        ],
      };
      assert.deepEqual(extractInlineConfigFromAst(ast, "test/MyTest.sol"), []);
    });

    it("should extract overrides from test functions", () => {
      const ast = {
        nodeType: "SourceUnit",
        nodes: [
          {
            nodeType: "ContractDefinition",
            name: "MyTest",
            nodes: [
              {
                nodeType: "FunctionDefinition",
                name: "testFoo",
                documentation: {
                  nodeType: "StructuredDocumentation",
                  text: " hardhat-config: fuzz.runs = 10",
                },
              },
            ],
          },
        ],
      };
      const result = extractInlineConfigFromAst(ast, "test/MyTest.sol");
      assert.equal(result.length, 1);
      assert.equal(result[0].contractName, "MyTest");
      assert.equal(result[0].functionName, "testFoo");
      assert.equal(result[0].key, "fuzz.runs");
      assert.equal(result[0].rawValue, "10");
    });

    it("should extract overrides from invariant functions", () => {
      const ast = {
        nodeType: "SourceUnit",
        nodes: [
          {
            nodeType: "ContractDefinition",
            name: "MyTest",
            nodes: [
              {
                nodeType: "FunctionDefinition",
                name: "invariantCheck",
                documentation: {
                  nodeType: "StructuredDocumentation",
                  text: " hardhat-config: invariant.runs = 5",
                },
              },
            ],
          },
        ],
      };
      const result = extractInlineConfigFromAst(ast, "test/MyTest.sol");
      assert.equal(result.length, 1);
      assert.equal(result[0].functionName, "invariantCheck");
      assert.equal(result[0].key, "invariant.runs");
    });

    it("should extract from multi-line documentation", () => {
      const ast = {
        nodeType: "SourceUnit",
        nodes: [
          {
            nodeType: "ContractDefinition",
            name: "MyTest",
            nodes: [
              {
                nodeType: "FunctionDefinition",
                name: "testFoo",
                documentation: {
                  nodeType: "StructuredDocumentation",
                  text: " @notice A test\n * hardhat-config: fuzz.runs = 10",
                },
              },
            ],
          },
        ],
      };
      const result = extractInlineConfigFromAst(ast, "test/MyTest.sol");
      assert.equal(result.length, 1);
      assert.equal(result[0].key, "fuzz.runs");
    });

    it("should handle mixed config and non-config lines", () => {
      const ast = {
        nodeType: "SourceUnit",
        nodes: [
          {
            nodeType: "ContractDefinition",
            name: "MyTest",
            nodes: [
              {
                nodeType: "FunctionDefinition",
                name: "testFoo",
                documentation: {
                  nodeType: "StructuredDocumentation",
                  text: " @notice This runs a fuzz test\n hardhat-config: fuzz.runs = 5",
                },
              },
            ],
          },
        ],
      };
      const result = extractInlineConfigFromAst(ast, "test/MyTest.sol");
      assert.equal(result.length, 1);
      assert.equal(result[0].key, "fuzz.runs");
      assert.equal(result[0].rawValue, "5");
    });
  });

  describe("validateInlineOverrides", () => {
    it("should accept valid number key", () => {
      validateInlineOverrides([
        makeRawOverride({ key: "fuzz.runs", rawValue: "10" }),
      ]);
    });

    it("should accept valid boolean values", () => {
      validateInlineOverrides([
        makeRawOverride({ key: "fuzz.showLogs", rawValue: "true" }),
      ]);
      validateInlineOverrides([
        makeRawOverride({ key: "fuzz.showLogs", rawValue: "false" }),
      ]);
    });

    it("should throw INVALID_KEY for unknown key", () => {
      assertThrowsHardhatError(
        () =>
          validateInlineOverrides([
            makeRawOverride({
              key: "fuzz.nonexistent",
              rawValue: "5",
            }),
          ]),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INLINE_CONFIG_INVALID_KEY,
        {
          key: "fuzz.nonexistent",
          functionFqn: getFunctionFqn("test/MyTest.sol", "MyTest", "testFoo"),
          validKeys:
            "fuzz.runs, fuzz.maxTestRejects, fuzz.showLogs, fuzz.timeout, invariant.runs, invariant.depth, invariant.failOnRevert, invariant.callOverride, invariant.timeout, allowInternalExpectRevert",
        },
      );
    });

    it("should throw DUPLICATE_KEY for repeated key on same function", () => {
      assertThrowsHardhatError(
        () =>
          validateInlineOverrides([
            makeRawOverride({ key: "fuzz.runs", rawValue: "10" }),
            makeRawOverride({ key: "fuzz.runs", rawValue: "20" }),
          ]),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INLINE_CONFIG_DUPLICATE_KEY,
        {
          key: "fuzz.runs",
          functionFqn: getFunctionFqn("test/MyTest.sol", "MyTest", "testFoo"),
        },
      );
    });

    it("should throw INVALID_VALUE for non-numeric on number key", () => {
      assertThrowsHardhatError(
        () =>
          validateInlineOverrides([
            makeRawOverride({ key: "fuzz.runs", rawValue: "abc" }),
          ]),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INLINE_CONFIG_INVALID_VALUE,
        {
          value: "abc",
          key: "fuzz.runs",
          expectedType: "non-negative integer",
          functionFqn: getFunctionFqn("test/MyTest.sol", "MyTest", "testFoo"),
        },
      );
    });

    it("should throw INVALID_VALUE for negative number", () => {
      assertThrowsHardhatError(
        () =>
          validateInlineOverrides([
            makeRawOverride({ key: "fuzz.runs", rawValue: "-1" }),
          ]),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INLINE_CONFIG_INVALID_VALUE,
        {
          value: "-1",
          key: "fuzz.runs",
          expectedType: "non-negative integer",
          functionFqn: getFunctionFqn("test/MyTest.sol", "MyTest", "testFoo"),
        },
      );
    });

    it("should accept zero", () => {
      validateInlineOverrides([
        makeRawOverride({ key: "fuzz.runs", rawValue: "0" }),
      ]);
    });

    it("should throw INVALID_VALUE for float", () => {
      assertThrowsHardhatError(
        () =>
          validateInlineOverrides([
            makeRawOverride({ key: "fuzz.runs", rawValue: "1.5" }),
          ]),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INLINE_CONFIG_INVALID_VALUE,
        {
          value: "1.5",
          key: "fuzz.runs",
          expectedType: "non-negative integer",
          functionFqn: getFunctionFqn("test/MyTest.sol", "MyTest", "testFoo"),
        },
      );
    });

    it("should throw INVALID_VALUE for scientific notation", () => {
      assertThrowsHardhatError(
        () =>
          validateInlineOverrides([
            makeRawOverride({ key: "fuzz.runs", rawValue: "1e3" }),
          ]),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INLINE_CONFIG_INVALID_VALUE,
        {
          value: "1e3",
          key: "fuzz.runs",
          expectedType: "non-negative integer",
          functionFqn: getFunctionFqn("test/MyTest.sol", "MyTest", "testFoo"),
        },
      );
    });

    it("should throw INVALID_VALUE for hex literal", () => {
      assertThrowsHardhatError(
        () =>
          validateInlineOverrides([
            makeRawOverride({ key: "fuzz.runs", rawValue: "0x10" }),
          ]),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INLINE_CONFIG_INVALID_VALUE,
        {
          value: "0x10",
          key: "fuzz.runs",
          expectedType: "non-negative integer",
          functionFqn: getFunctionFqn("test/MyTest.sol", "MyTest", "testFoo"),
        },
      );
    });

    it("should throw INVALID_VALUE for leading zeros", () => {
      assertThrowsHardhatError(
        () =>
          validateInlineOverrides([
            makeRawOverride({ key: "fuzz.runs", rawValue: "007" }),
          ]),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INLINE_CONFIG_INVALID_VALUE,
        {
          value: "007",
          key: "fuzz.runs",
          expectedType: "non-negative integer",
          functionFqn: getFunctionFqn("test/MyTest.sol", "MyTest", "testFoo"),
        },
      );
    });

    it("should throw INVALID_VALUE for value beyond MAX_SAFE_INTEGER", () => {
      assertThrowsHardhatError(
        () =>
          validateInlineOverrides([
            makeRawOverride({
              key: "fuzz.runs",
              rawValue: "9007199254740992",
            }),
          ]),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INLINE_CONFIG_INVALID_VALUE,
        {
          value: "9007199254740992",
          key: "fuzz.runs",
          expectedType: "non-negative integer",
          functionFqn: getFunctionFqn("test/MyTest.sol", "MyTest", "testFoo"),
        },
      );
    });

    it("should throw INVALID_VALUE for non-boolean on boolean key", () => {
      assertThrowsHardhatError(
        () =>
          validateInlineOverrides([
            makeRawOverride({
              key: "invariant.failOnRevert",
              rawValue: "yes",
            }),
          ]),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INLINE_CONFIG_INVALID_VALUE,
        {
          value: "yes",
          key: "invariant.failOnRevert",
          expectedType: "boolean",
          functionFqn: getFunctionFqn("test/MyTest.sol", "MyTest", "testFoo"),
        },
      );
    });
  });

  describe("resolveFunctionSelector", () => {
    it("should return 0x-prefixed selector for matching function", () => {
      assert.equal(
        resolveFunctionSelector({ "testFuzz()": "deadbeef" }, "testFuzz"),
        "0xdeadbeef",
      );
    });

    it("should match parameterized function signatures", () => {
      assert.equal(
        resolveFunctionSelector(
          { "testFuzz(uint256)": "12345678" },
          "testFuzz",
        ),
        "0x12345678",
      );
    });

    it("should return undefined when no match exists", () => {
      assert.equal(resolveFunctionSelector({}, "testHelper"), undefined);
    });
  });

  describe("buildConfigOverride", () => {
    it("should build fuzz section from dotted key", () => {
      assert.deepEqual(
        buildConfigOverride([
          makeRawOverride({ key: "fuzz.runs", rawValue: "50" }),
        ]),
        { fuzz: { runs: 50 } },
      );
    });

    it("should build invariant section from dotted key", () => {
      assert.deepEqual(
        buildConfigOverride([
          makeRawOverride({ key: "invariant.depth", rawValue: "20" }),
        ]),
        { invariant: { depth: 20 } },
      );
    });

    it("should place top-level keys at root", () => {
      assert.deepEqual(
        buildConfigOverride([
          makeRawOverride({
            key: "allowInternalExpectRevert",
            rawValue: "true",
          }),
        ]),
        { allowInternalExpectRevert: true },
      );
    });

    it("should map fuzz.timeout to { time: N }", () => {
      assert.deepEqual(
        buildConfigOverride([
          makeRawOverride({ key: "fuzz.timeout", rawValue: "30" }),
        ]),
        { fuzz: { timeout: { time: 30 } } },
      );
    });

    it("should map invariant.timeout to { time: N }", () => {
      assert.deepEqual(
        buildConfigOverride([
          makeRawOverride({ key: "invariant.timeout", rawValue: "60" }),
        ]),
        { invariant: { timeout: { time: 60 } } },
      );
    });

    it("should combine multiple keys into one config", () => {
      assert.deepEqual(
        buildConfigOverride([
          makeRawOverride({ key: "fuzz.runs", rawValue: "10" }),
          makeRawOverride({ key: "fuzz.maxTestRejects", rawValue: "500" }),
        ]),
        { fuzz: { runs: 10, maxTestRejects: 500 } },
      );
    });

    it("should parse boolean false correctly", () => {
      assert.deepEqual(
        buildConfigOverride([
          makeRawOverride({ key: "fuzz.showLogs", rawValue: "false" }),
        ]),
        { fuzz: { showLogs: false } },
      );
    });
  });

  describe("extractDocText", () => {
    it("should return text from StructuredDocumentation node", () => {
      const result = extractDocText({
        nodeType: "StructuredDocumentation",
        text: "some text",
      });
      assert.equal(result, "some text");
    });

    it("should return string documentation as-is", () => {
      assert.equal(extractDocText("hello"), "hello");
    });

    it("should return undefined for null", () => {
      assert.equal(extractDocText(null), undefined);
    });

    it("should return undefined for non-matching object", () => {
      assert.equal(extractDocText({ nodeType: "Other" }), undefined);
    });
  });

  describe("parseInlineConfigLine", () => {
    const parse = (line: string) =>
      parseInlineConfigLine(line, "test/MyTest.sol", "MyTest", "testFn");

    it("should return undefined for non-config lines", () => {
      assert.equal(parse("@notice just a comment"), undefined);
    });

    it("should parse hardhat-config: key=value", () => {
      const result = parse(" hardhat-config: fuzz.runs = 50");
      assert.notEqual(result, undefined);
      assert.equal(result?.key, "fuzz.runs");
      assert.equal(result?.rawValue, "50");
    });

    it("should parse forge-config: key=value without profile", () => {
      const result = parse(" forge-config: fuzz.runs = 100");
      assert.notEqual(result, undefined);
      assert.equal(result?.key, "fuzz.runs");
      assert.equal(result?.rawValue, "100");
    });

    it("should strip default profile from forge-config:", () => {
      const result = parse(" forge-config: default.fuzz.runs = 100");
      assert.notEqual(result, undefined);
      assert.equal(result?.key, "fuzz.runs");
    });

    it("should throw UNSUPPORTED_PROFILE for non-default forge profile", () => {
      assertThrowsHardhatError(
        () => parse(" forge-config: ci.fuzz.runs = 100"),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS
          .INLINE_CONFIG_UNSUPPORTED_PROFILE,
        {
          profile: "ci",
          functionFqn: getFunctionFqn("test/MyTest.sol", "MyTest", "testFn"),
        },
      );
    });

    it("should throw INVALID_SYNTAX when = is missing", () => {
      assertThrowsHardhatError(
        () => parse("hardhat-config: fuzz.runs 10"),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INLINE_CONFIG_INVALID_SYNTAX,
        {
          line: "hardhat-config: fuzz.runs 10",
          functionFqn: getFunctionFqn("test/MyTest.sol", "MyTest", "testFn"),
        },
      );
    });

    it("should convert kebab-case keys to camelCase", () => {
      const result = parse(" forge-config: fuzz.max-test-rejects = 50");
      assert.notEqual(result, undefined);
      assert.equal(result?.key, "fuzz.maxTestRejects");
    });

    it("should strip leading whitespace and asterisk", () => {
      const result = parse(" * hardhat-config: fuzz.runs = 10");
      assert.notEqual(result, undefined);
      assert.equal(result?.key, "fuzz.runs");
      assert.equal(result?.rawValue, "10");
    });

    it("should handle line with no leading whitespace", () => {
      const result = parse("hardhat-config: fuzz.runs = 10");
      assert.notEqual(result, undefined);
      assert.equal(result?.key, "fuzz.runs");
    });
  });

  describe("getFunctionFqn", () => {
    it("should return source:Contract#function format", () => {
      assert.equal(
        getFunctionFqn("test/MyTest.sol", "MyTest", "testFoo"),
        "test/MyTest.sol:MyTest#testFoo",
      );
    });
  });
});

function makeRawOverride(
  partial: Partial<RawInlineOverride> & { key: string; rawValue: string },
): RawInlineOverride {
  return {
    inputSourceName: partial.inputSourceName ?? "test/MyTest.sol",
    contractName: partial.contractName ?? "MyTest",
    functionName: partial.functionName ?? "testFoo",
    rawKey: partial.rawKey ?? partial.key,
    ...partial,
  };
}

function makeBuildInfo(
  inputSourceName: string,
  sourceContent: string,
  contracts: Record<
    string,
    {
      methodIdentifiers: Record<string, string>;
      functions: Array<{
        name: string;
        documentation?: string | null;
      }>;
    }
  >,
  solcVersion = "0.8.23",
): { buildInfo: Uint8Array; output: Uint8Array } {
  const buildInfoJson = {
    _format: "hh3-sol-build-info-1",
    id: "test-build-info",
    solcVersion,
    solcLongVersion: `${solcVersion}+commit.test`,
    userSourceNameMap: { [inputSourceName]: inputSourceName },
    input: {
      language: "Solidity",
      sources: { [inputSourceName]: { content: sourceContent } },
      settings: {
        optimizer: { enabled: false },
        outputSelection: {},
      },
    },
  };

  const astNodes = Object.entries(contracts).map(
    ([contractName, contract]) => ({
      nodeType: "ContractDefinition",
      name: contractName,
      nodes: contract.functions.map((fn) => ({
        nodeType: "FunctionDefinition",
        name: fn.name,
        documentation:
          fn.documentation !== undefined && fn.documentation !== null
            ? {
                nodeType: "StructuredDocumentation",
                text: fn.documentation,
              }
            : null,
      })),
    }),
  );

  const outputJson = {
    _format: "hh3-sol-build-info-output-1",
    id: "test-build-info",
    output: {
      sources: {
        [inputSourceName]: {
          id: 0,
          ast: {
            nodeType: "SourceUnit",
            nodes: astNodes,
          },
        },
      },
      contracts: {
        [inputSourceName]: Object.fromEntries(
          Object.entries(contracts).map(([contractName, contract]) => [
            contractName,
            {
              evm: { methodIdentifiers: contract.methodIdentifiers },
            },
          ]),
        ),
      },
    },
  };

  return {
    buildInfo: utf8StringToBytes(JSON.stringify(buildInfoJson)),
    output: utf8StringToBytes(JSON.stringify(outputJson)),
  };
}
