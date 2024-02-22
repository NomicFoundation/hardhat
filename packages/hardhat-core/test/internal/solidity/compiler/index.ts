import { assert } from "chai";

import {
  Compiler,
  NativeCompiler,
} from "../../../../src/internal/solidity/compiler";
import {
  CompilerDownloader,
  CompilerPlatform,
} from "../../../../src/internal/solidity/compiler/downloader";
import { CompilerInput } from "../../../../src/types";
import { useTmpDir } from "../../../helpers/fs";

const solcVersion = "0.6.6";

describe("Compiler", () => {
  describe("native", function () {
    useTmpDir("native-compiler-execution");

    let downloader: CompilerDownloader;
    let optimizerConfig: any;
    let solcPath: string;

    before(function () {
      optimizerConfig = {
        runs: 200,
        enabled: false,
      };
    });

    beforeEach(async function () {
      downloader = new CompilerDownloader(
        CompilerDownloader.getCompilerPlatform(),
        this.tmpDir
      );
      await downloader.downloadCompiler(
        solcVersion,
        async () => {},
        async () => {}
      );
      const compilerPathResult = await downloader.getCompiler(solcVersion);
      solcPath = compilerPathResult!.compilerPath;
    });

    it("Should compile contracts correctly", async () => {
      const input: CompilerInput = {
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

      const compiler = new NativeCompiler(solcPath);

      const output = await compiler.compile(input);

      // We just check some properties
      assert.isDefined(output.contracts);
      assert.isDefined(output.contracts["A.sol"]);
      assert.isDefined(output.contracts["A.sol"].A);

      assert.isDefined(output.sources);
      assert.isDefined(output.sources["A.sol"]);
      assert.isDefined(output.sources["A.sol"].ast);
      assert.strictEqual(output.sources["A.sol"].id, 0);
    });

    it("Shouldn't throw if there's a syntax error", async () => {
      const input: CompilerInput = {
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

      const compiler = new NativeCompiler(solcPath);

      const output = await compiler.compile(input);
      assert.isDefined(output.errors);
      assert.isNotEmpty(output.errors);
    });
  });

  describe("solcjs", function () {
    useTmpDir("solcjs-compiler-execution");

    let downloader: CompilerDownloader;
    let optimizerConfig: any;
    let solcPath: string;

    before(function () {
      optimizerConfig = {
        runs: 200,
        enabled: false,
      };
    });

    beforeEach(async function () {
      downloader = new CompilerDownloader(CompilerPlatform.WASM, this.tmpDir);
      await downloader.downloadCompiler(
        solcVersion,
        async () => {},
        async () => {}
      );
      const compilerPathResult = await downloader.getCompiler(solcVersion);
      solcPath = compilerPathResult!.compilerPath;
    });

    it("Should compile contracts correctly", async () => {
      const input: CompilerInput = {
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

      const compiler = new Compiler(solcPath);

      const output = await compiler.compile(input);

      // We just check some properties
      assert.isDefined(output.contracts);
      assert.isDefined(output.contracts["A.sol"]);
      assert.isDefined(output.contracts["A.sol"].A);

      assert.isDefined(output.sources);
      assert.isDefined(output.sources["A.sol"]);
      assert.isDefined(output.sources["A.sol"].ast);
      assert.strictEqual(output.sources["A.sol"].id, 0);
    });

    it("Shouldn't throw if there's a syntax error", async () => {
      const input: CompilerInput = {
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

      const compiler = new Compiler(solcPath);

      const output = await compiler.compile(input);
      assert.isDefined(output.errors);
      assert.isNotEmpty(output.errors);
    });
  });
});
