import { assert } from "chai";

import { Compiler } from "../../../../src/internal/solidity/compiler";
import { CompilerDownloader } from "../../../../src/internal/solidity/compiler/downloader";
import { SolcOptimizerConfig } from "../../../../src/types";
import { getLocalCompilerVersion } from "../../../helpers/compiler";

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

  it("Should compile contracts correctly", async () => {
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
      downloader
    );

    compiler
      .compile(input)
      .then(output => {
        // We just check some properties
        assert.isDefined(output.contracts);
        assert.isDefined(output.contracts["A.sol"]);
        assert.isDefined(output.contracts["A.sol"].A);

        assert.isDefined(output.sources);
        assert.isDefined(output.sources["A.sol"]);
        assert.isDefined(output.sources["A.sol"].ast);
        assert.equal(output.sources["A.sol"].id, 0);
      })
      .catch(err => {
        console.log(err);
      });
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
      downloader
    );

    const output = await compiler.compile(input);
    assert.isDefined(output.errors);
    assert.isNotEmpty(output.errors);
  });

  describe("Compiler version selection", () => {
    it("Shouldn't use the downloader if the local version is used", async () => {
      const compiler = new Compiler(
        getLocalCompilerVersion(),
        __dirname,
        downloader
      );

      await compiler.getSolc();

      assert.isFalse(downloader.wasCalled);

      await compiler.getSolc();

      assert.isFalse(downloader.wasCalled);
    });

    it("Should call the downloader otherwise", async () => {
      const compiler = new Compiler("0.5.0", __dirname, downloader);

      await compiler.getSolc();

      assert.isTrue(downloader.wasCalled);
    });
  });
});
