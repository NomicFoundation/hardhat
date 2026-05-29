import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { utf8StringToBytes } from "@nomicfoundation/hardhat-utils/bytes";

import { parseSolidityTestBuildInfoOutput } from "../../../../src/internal/builtin-plugins/solidity-test/build-info-output.js";

describe("parseSolidityTestBuildInfoOutput", () => {
  it("extracts source ASTs and method identifiers from build-info output bytes", () => {
    const output = {
      _format: "hh3-sol-build-info-output-1",
      id: "solc-0_8_23-aaaaaaaa",
      output: {
        contracts: {
          "project/test/Foo.sol": {
            Foo: {
              abi: [],
              evm: {
                bytecode: { object: "ab".repeat(1_000_000) },
                deployedBytecode: { object: "cd".repeat(1_000_000) },
                methodIdentifiers: {
                  "testExample()": "abcdef01",
                },
              },
              metadata: "{}",
            },
          },
        },
        sources: {
          "project/test/Foo.sol": {
            id: 0,
            ast: {
              nodeType: "SourceUnit",
              nodes: [],
            },
          },
        },
      },
    };

    const parsed = parseSolidityTestBuildInfoOutput(
      utf8StringToBytes(JSON.stringify(output)),
    );

    assert.deepEqual(parsed.output.sources?.["project/test/Foo.sol"].ast, {
      nodeType: "SourceUnit",
      nodes: [],
    });
    assert.deepEqual(
      parsed.output.contracts?.["project/test/Foo.sol"].Foo.evm
        ?.methodIdentifiers,
      { "testExample()": "abcdef01" },
    );
    const evm = parsed.output.contracts?.["project/test/Foo.sol"].Foo.evm;
    assert.notEqual(evm, undefined);
    assert.equal("bytecode" in evm, false);
  });

  it("handles escaped property names while scanning JSON bytes", () => {
    const inputSourceName = "project/test/With\\Escape.sol";
    const output = {
      output: {
        sources: {
          [inputSourceName]: {
            ast: { nodeType: "SourceUnit", nodes: [] },
          },
        },
        contracts: {},
      },
    };

    const parsed = parseSolidityTestBuildInfoOutput(
      utf8StringToBytes(JSON.stringify(output)),
    );

    assert.deepEqual(parsed.output.sources?.[inputSourceName].ast, {
      nodeType: "SourceUnit",
      nodes: [],
    });
  });
});
