import type { CompilerInput } from "../../../../../../src/types/solidity.js";

import assert from "node:assert/strict";
import { afterEach, before, beforeEach, describe, it, mock } from "node:test";

import { useTmpDir } from "@nomicfoundation/hardhat-test-utils";

import {
  NativeCompiler,
  SolcJsCompiler,
} from "../../../../../../src/internal/builtin-plugins/solidity/build-system/compiler/compiler.js";
import {
  CompilerDownloaderImplementation as CompilerDownloader,
  CompilerDownloaderImplementation,
  CompilerPlatform,
} from "../../../../../../src/internal/builtin-plugins/solidity/build-system/compiler/downloader.js";
import { getCompiler } from "../../../../../../src/internal/builtin-plugins/solidity/build-system/compiler/index.js";
import { spawn } from "../../../../../../src/internal/cli/init/subprocess.js";

const solcVersion = "0.6.6";

describe(
  "Compiler",
  {
    skip: process.env.HARDHAT_DISABLE_SLOW_TESTS === "true",
  },
  () => {
    describe("native", function () {
      useTmpDir("native-compiler-execution");

      let downloader: CompilerDownloader;
      let optimizerConfig: CompilerInput["settings"]["optimizer"];
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
          process.cwd(),
        );
        await downloader.updateCompilerListIfNeeded(new Set([solcVersion]));
        await downloader.downloadCompiler(solcVersion);
        const compilerPathResult = await downloader.getCompiler(solcVersion);
        assert.ok(
          compilerPathResult !== undefined,
          "Compiler path should be defined",
        );
        solcPath = compilerPathResult.compilerPath;
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

        const compiler = new NativeCompiler(solcVersion, solcVersion, solcPath);

        const output = await compiler.compile(input);

        // We just check some properties
        assert.ok(
          output.contracts !== undefined,
          "Contracts should be defined",
        );
        assert.ok(
          output.contracts["A.sol"] !== undefined,
          "Contract should be defined",
        );
        assert.ok(
          output.contracts["A.sol"].A !== undefined,
          "Contract should be defined",
        );

        assert.ok(output.sources !== undefined, "Sources should be defined");
        assert.ok(
          output.sources["A.sol"] !== undefined,
          "Source should be defined",
        );
        assert.ok(
          output.sources["A.sol"].ast !== undefined,
          "AST should be defined",
        );
        assert.equal(output.sources["A.sol"].id, 0);
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

        const compiler = new NativeCompiler(solcVersion, solcVersion, solcPath);

        const output = await compiler.compile(input);
        assert.ok(output.errors !== undefined, "Errors should be defined");
        assert.ok(
          output.errors.length > 0,
          "Errors should contain some errors",
        );
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
        downloader = new CompilerDownloader(
          CompilerPlatform.WASM,
          process.cwd(),
        );
        await downloader.updateCompilerListIfNeeded(new Set([solcVersion]));
        await downloader.downloadCompiler(solcVersion);
        const compilerPathResult = await downloader.getCompiler(solcVersion);
        assert.ok(
          compilerPathResult !== undefined,
          "Compiler path should be defined",
        );
        solcPath = compilerPathResult.compilerPath;

        // We need to install the tsx dependency in the temporary workspace
        // for the compilation to succeed.
        await spawn("npm", ["install", "tsx", "--no-save"], {
          cwd: process.cwd(),
          shell: true,
          stdio: undefined,
        });
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

        const compiler = new SolcJsCompiler(solcVersion, solcVersion, solcPath);

        const output = await compiler.compile(input);

        // We just check some properties
        assert.ok(
          output.contracts !== undefined,
          "Contracts should be defined",
        );
        assert.ok(
          output.contracts["A.sol"] !== undefined,
          "Contract should be defined",
        );
        assert.ok(
          output.contracts["A.sol"].A !== undefined,
          "Contract should be defined",
        );

        assert.ok(output.sources !== undefined, "Sources should be defined");
        assert.ok(
          output.sources["A.sol"] !== undefined,
          "Source should be defined",
        );
        assert.ok(
          output.sources["A.sol"].ast !== undefined,
          "AST should be defined",
        );
        assert.equal(output.sources["A.sol"].id, 0);
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

        const compiler = new SolcJsCompiler(solcVersion, solcVersion, solcPath);

        const output = await compiler.compile(input);
        assert.ok(output.errors !== undefined, "Errors should be defined");
        assert.ok(
          output.errors.length > 0,
          "Errors should contain some errors",
        );
      });
    });
  },
);

describe("getCompiler", () => {
  useTmpDir("get-compiler");

  const solcVersion = "0.8.28";

  beforeEach(async () => {
    // We mock the downloader to always return the linux platform, so a native compiler is always available
    mock.method(
      CompilerDownloaderImplementation,
      "getCompilerPlatform",
      () => CompilerPlatform.LINUX,
    );
    const downloader = new CompilerDownloader(
      CompilerPlatform.LINUX,
      process.cwd(),
    );

    await downloader.updateCompilerListIfNeeded(new Set([solcVersion]));
    await downloader.downloadCompiler(solcVersion);
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("should return the native compiler if preferWasm is false", async () => {
    const compiler = await getCompiler(solcVersion, false);
    assert.equal(compiler.isSolcJs, false);
  });

  it("should return solcjs compiler if preferWasm is true", async () => {
    const compiler = await getCompiler(solcVersion, true);
    assert.equal(compiler.isSolcJs, true);
  });
});
