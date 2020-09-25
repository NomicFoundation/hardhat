import { assert } from "chai";

import { Compiler } from "../../../../src/internal/solidity/compiler";
import { CompilerDownloader } from "../../../../src/internal/solidity/compiler/downloader";
import { SolcOptimizerConfig } from "../../../../src/types";
import { useTmpDir } from "../../../helpers/fs";

const solcVersion = "0.6.6";

describe("Compiler", () => {
  useTmpDir("compiler-execution");

  let downloader: CompilerDownloader;
  let optimizerConfig: SolcOptimizerConfig;
  let solcJsPath: string;

  before(function () {
    optimizerConfig = {
      runs: 200,
      enabled: false,
    };
  });

  beforeEach(async function () {
    downloader = new CompilerDownloader(this.tmpDir);
    solcJsPath = await downloader.getDownloadedCompilerPath(solcVersion);
  });

  it("Should compile contracts correctly", async () => {
    const input = {
      language: "Solidity",
      sources: {
        "A.sol": {
          content: `
pragma solidity ^${solcVersion};
contract A {}
`,
        },
      },
      settings: {
        evmVersion: "byzantium",
        metadata: {
          useLiteralContent: true,
        },
        optimizer: optimizerConfig,
        outputSelection: {
          "*": {
            "*": ["evm.bytecode.object", "abi"],
            "": ["ast"],
          },
        },
      },
    };

    const compiler = new Compiler(solcJsPath);

    compiler
      .compile(input)
      .then((output) => {
        // We just check some properties
        assert.isDefined(output.contracts);
        assert.isDefined(output.contracts["A.sol"]);
        assert.isDefined(output.contracts["A.sol"].A);

        assert.isDefined(output.sources);
        assert.isDefined(output.sources["A.sol"]);
        assert.isDefined(output.sources["A.sol"].ast);
        assert.equal(output.sources["A.sol"].id, 0);
      })
      .catch((err) => {
        console.log(err);
        assert.fail(err);
      });
  });

  it("Shouldn't throw if there's a syntax error", async () => {
    const input = {
      language: "Solidity",
      sources: {
        "A.sol": {
          content: `pragma sol`,
        },
      },
      settings: {
        evmVersion: "byzantium",
        metadata: {
          useLiteralContent: true,
        },
        optimizer: optimizerConfig,
        outputSelection: {
          "*": {
            "*": ["evm.bytecode.object", "abi"],
            "": ["ast"],
          },
        },
      },
    };

    const compiler = new Compiler(solcJsPath);

    const output = await compiler.compile(input);
    assert.isDefined(output.errors);
    assert.isNotEmpty(output.errors);
  });
});
