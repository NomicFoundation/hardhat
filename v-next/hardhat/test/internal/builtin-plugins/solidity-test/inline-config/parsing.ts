import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { utf8StringToBytes } from "@nomicfoundation/hardhat-utils/bytes";

import {
  buildInfoContainsInlineConfig,
  extractDocText,
  extractInlineConfigFromAst,
  getFunctionFqn,
  parseInlineConfigLine,
} from "../../../../../src/internal/builtin-plugins/solidity-test/inline-config/index.js";

describe("inline-config - parsing", () => {
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
      assert.equal(result[0].functionSelector, undefined);
    });

    it("should extract functionSelector from AST when present", () => {
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
                functionSelector: "aabbccdd",
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
      assert.equal(result[0].functionSelector, "aabbccdd");
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

    it("should convert snake_case keys to camelCase", () => {
      const result = parse(" hardhat-config: fuzz.max_test_rejects = 50");
      assert.notEqual(result, undefined);
      assert.equal(result?.key, "fuzz.maxTestRejects");
    });

    it("should convert snake_case keys to camelCase for forge-config", () => {
      const result = parse(" forge-config: invariant.fail_on_revert = true");
      assert.notEqual(result, undefined);
      assert.equal(result?.key, "invariant.failOnRevert");
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
