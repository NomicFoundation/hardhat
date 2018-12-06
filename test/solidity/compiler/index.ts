import { assert } from "chai";

import { Compiler, SolcOptimizerConfig } from "../../../src/solidity/compiler";
import { CompilerDownloader } from "../../../src/solidity/compiler/downloader";
import { DependencyGraph } from "../../../src/solidity/dependencyGraph";
import { ResolvedFile, Resolver } from "../../../src/solidity/resolver";
import { getLocalCompilerVersion } from "../../helpers/compiler";

class MockedDownloader extends CompilerDownloader {
  public wasCalled = false;

  public async getDownloadedCompilerPath(version: string): Promise<string> {
    this.wasCalled = true;
    return require.resolve("solc/soljson.js");
  }
}

describe("Compiler", () => {
  let downloader: MockedDownloader;
  let optimizerConfig: SolcOptimizerConfig;

  before(() => {
    downloader = new MockedDownloader(
      __dirname,
      getLocalCompilerVersion(),
      async () => {
        throw new Error("This shouldn't be called");
      }
    );
    optimizerConfig = {
      runs: 200,
      enabled: false
    };
  });

  it("Should compiler contracts correctly", async () => {
    const input = {
      language: "Solidity",
      sources: {
        "A.sol": {
          content: `
pragma solidity ^${getLocalCompilerVersion()};
contract A {}
`
        }
      },
      settings: {
        evmVersion: "byzantium",
        metadata: {
          useLiteralContent: true
        },
        optimizer: optimizerConfig,
        outputSelection: {
          "*": {
            "*": ["evm.bytecode.object", "abi"],
            "": ["ast"]
          }
        }
      }
    };

    const compiler = new Compiler(
      getLocalCompilerVersion(),
      __dirname,
      optimizerConfig,
      downloader
    );

    const output = await compiler.compile(input);

    // We just check some properties
    assert.isDefined(output.contracts);
    assert.isDefined(output.contracts["A.sol"]);
    assert.isDefined(output.contracts["A.sol"].A);

    assert.isDefined(output.sources);
    assert.isDefined(output.sources["A.sol"]);
    assert.isDefined(output.sources["A.sol"].ast);
    assert.equal(output.sources["A.sol"].id, 0);
  });

  it("Shouldn't throw if there's a syntax error", async () => {
    const input = {
      language: "Solidity",
      sources: {
        "A.sol": {
          content: `pragma sol`
        }
      },
      settings: {
        evmVersion: "byzantium",
        metadata: {
          useLiteralContent: true
        },
        optimizer: optimizerConfig,
        outputSelection: {
          "*": {
            "*": ["evm.bytecode.object", "abi"],
            "": ["ast"]
          }
        }
      }
    };

    const compiler = new Compiler(
      getLocalCompilerVersion(),
      __dirname,
      optimizerConfig,
      downloader
    );

    const output = await compiler.compile(input);
    assert.isDefined(output.errors);
    assert.isNotEmpty(output.errors);
  });

  it("Should construct the right input for a dependency graph", async () => {
    const globalName1 = "the/global/name.sol";
    const path1 = "/fake/absolute/path";
    const content1 = "THE CONTENT1";

    const globalName2 = "the/global/name2.sol";
    const path2 = "/fake/absolute/path2";
    const content2 = "THE CONTENT2";

    const expectedInput = {
      language: "Solidity",
      sources: {
        [globalName1]: { content: content1 },
        [globalName2]: { content: content2 }
      },
      settings: {
        evmVersion: "byzantium",
        metadata: {
          useLiteralContent: true
        },
        optimizer: optimizerConfig,
        outputSelection: {
          "*": {
            "*": ["evm.bytecode.object", "abi"],
            "": ["ast"]
          }
        }
      }
    };

    const graph = await DependencyGraph.createFromResolvedFiles(
      new Resolver("."),
      [
        new ResolvedFile(globalName1, path1, content1, new Date()),
        new ResolvedFile(globalName2, path2, content2, new Date())
      ]
    );

    const compiler = new Compiler(
      getLocalCompilerVersion(),
      __dirname,
      optimizerConfig,
      downloader
    );

    const input = compiler.getInputFromDependencyGraph(graph);

    assert.deepEqual(input, expectedInput);
  });

  describe("Compiler version selection", () => {
    it("Shouldn't use the downloader if the local version is used", async () => {
      const compiler = new Compiler(
        getLocalCompilerVersion(),
        __dirname,
        optimizerConfig,
        downloader
      );

      await compiler.getSolc();

      assert.isFalse(downloader.wasCalled);

      await compiler.getSolc();

      assert.isFalse(downloader.wasCalled);
    });

    it("Should call the downloader otherwise", async () => {
      const compiler = new Compiler(
        "0.5.0",
        __dirname,
        optimizerConfig,
        downloader
      );

      await compiler.getSolc();

      assert.isTrue(downloader.wasCalled);
    });
  });
});
