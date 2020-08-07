import { assert } from "chai";

import { getInputFromDependencyGraph } from "../../../../src/internal/solidity/compiler/compiler-input";
import { DependencyGraph } from "../../../../src/internal/solidity/dependencyGraph";
import { Parser } from "../../../../src/internal/solidity/parse";
import {
  ResolvedFile,
  Resolver,
} from "../../../../src/internal/solidity/resolver";
import { SolcInput } from "../../../../src/types";

describe("compiler-input module", function () {
  it("Should construct the right input for a dependency graph", async () => {
    const optimizerConfig = {
      runs: 200,
      enabled: false,
    };

    const globalName1 = "the/global/name.sol";
    const path1 = "/fake/absolute/path";
    const content1 = "THE CONTENT1";

    const globalName2 = "the/global/name2.sol";
    const path2 = "/fake/absolute/path2";
    const content2 = "THE CONTENT2";

    const expectedInput: SolcInput = {
      language: "Solidity",
      sources: {
        [globalName1]: { content: content1 },
        [globalName2]: { content: content2 },
      },
      settings: {
        metadata: {
          useLiteralContent: true,
        },
        optimizer: optimizerConfig,
        outputSelection: {
          "*": {
            "*": [
              "abi",
              "evm.bytecode",
              "evm.deployedBytecode",
              "evm.methodIdentifiers",
            ],
            "": ["id", "ast"],
          },
        },
      },
    };

    const graph = await DependencyGraph.createFromResolvedFiles(
      new Resolver(".", new Parser({})),
      [
        new ResolvedFile(
          globalName1,
          path1,
          { rawContent: content1, imports: [], versionPragmas: [] },
          new Date()
        ),
        new ResolvedFile(
          globalName2,
          path2,
          { rawContent: content2, imports: [], versionPragmas: [] },
          new Date()
        ),
      ]
    );

    const input = getInputFromDependencyGraph(
      graph,
      optimizerConfig,
      undefined
    );

    assert.deepEqual(input, expectedInput);

    const inputWithEvmVersion = getInputFromDependencyGraph(
      graph,
      optimizerConfig,
      "byzantium"
    );

    expectedInput.settings.evmVersion = "byzantium";

    assert.deepEqual(inputWithEvmVersion, expectedInput);
  });
});
