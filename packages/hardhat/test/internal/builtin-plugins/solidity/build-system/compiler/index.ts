import type { CompilerInput } from "../../../../../../src/types/solidity.js";

import assert from "node:assert/strict";
import path from "node:path";
import { after, before, beforeEach, describe, it } from "node:test";

import { createTmpDir } from "@nomicfoundation/hardhat-test-utils";
import { writeJsonFile } from "@nomicfoundation/hardhat-utils/fs";
import {
  resetMockCacheDir,
  setMockCacheDir,
} from "@nomicfoundation/hardhat-utils/global-dir";

import {
  NativeCompiler,
  SolcJsCompiler,
} from "../../../../../../src/internal/builtin-plugins/solidity/build-system/compiler/compiler.js";
import {
  CompilerDownloaderImplementation as CompilerDownloader,
  CompilerPlatform,
} from "../../../../../../src/internal/builtin-plugins/solidity/build-system/compiler/downloader.js";
import {
  downloadSolcCompilers,
  getCompiler,
  hasNativeBuildForPlatform,
} from "../../../../../../src/internal/builtin-plugins/solidity/build-system/compiler/index.js";
import {
  hasArm64MirrorBuild,
  hasOfficialArm64Build,
} from "../../../../../../src/internal/builtin-plugins/solidity/build-system/solc-info.js";
import { spawn } from "../../../../../../src/internal/cli/init/subprocess.js";

const solcVersion = "0.6.6";

describe(
  "Compiler",
  {
    skip: process.env.HARDHAT_DISABLE_SLOW_TESTS === "true",
  },
  () => {
    describe("native", function () {
      const tmp = createTmpDir("native-compiler-execution", "test");

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
          tmp.path,
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
      const tmp = createTmpDir("solcjs-compiler-execution", "test");

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
        // The workspace's package.json sets `"type": "module"`, which would
        // cascade into this tmp dir and make Node try to load solc's
        // downloaded WASM bundle (a `.js` CJS file using `__dirname`) as ESM.
        // Plant a package.json that opts this subtree out.
        await writeJsonFile(path.join(tmp.path, "package.json"), {
          type: "commonjs",
        });

        downloader = new CompilerDownloader(CompilerPlatform.WASM, tmp.path);
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
          cwd: tmp.path,
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

    describe("hasNativeBuildForPlatform", function () {
      it("returns true for all versions on non-ARM64 platforms", () => {
        for (const platform of [
          CompilerPlatform.LINUX,
          CompilerPlatform.MACOS,
          CompilerPlatform.WINDOWS,
          CompilerPlatform.WASM,
        ]) {
          assert.equal(hasNativeBuildForPlatform("0.4.0", platform), true);
          assert.equal(hasNativeBuildForPlatform("0.4.24", platform), true);
          assert.equal(hasNativeBuildForPlatform("0.5.0", platform), true);
          assert.equal(hasNativeBuildForPlatform("0.8.28", platform), true);
          assert.equal(hasNativeBuildForPlatform("0.8.31", platform), true);
        }
      });

      it("returns false for versions below 0.5.0 on ARM64", () => {
        assert.equal(
          hasNativeBuildForPlatform("0.4.0", CompilerPlatform.LINUX_ARM64),
          false,
        );
        assert.equal(
          hasNativeBuildForPlatform("0.4.24", CompilerPlatform.LINUX_ARM64),
          false,
        );
      });

      it("returns true for mirror-range versions on ARM64", () => {
        assert.equal(
          hasNativeBuildForPlatform("0.5.0", CompilerPlatform.LINUX_ARM64),
          true,
        );
        assert.equal(
          hasNativeBuildForPlatform("0.8.30", CompilerPlatform.LINUX_ARM64),
          true,
        );
      });

      it("returns true for official ARM64 versions on ARM64", () => {
        assert.equal(
          hasNativeBuildForPlatform("0.8.31", CompilerPlatform.LINUX_ARM64),
          true,
        );
        assert.equal(
          hasNativeBuildForPlatform("0.9.0", CompilerPlatform.LINUX_ARM64),
          true,
        );
      });
    });

    describe(
      "ARM64 WASM fallback for old versions",
      {
        skip:
          CompilerDownloader.getCompilerPlatform() !==
          CompilerPlatform.LINUX_ARM64,
      },
      function () {
        const tmp = createTmpDir("arm64-wasm-fallback", "describe");

        before(function () {
          setMockCacheDir(tmp.path);
        });

        after(function () {
          resetMockCacheDir();
        });

        it("should fall back to WASM when no native ARM64 build exists for 0.4.x", async () => {
          const version = "0.4.24";

          // Verify our precondition: 0.4.24 has no native ARM64 build
          assert.equal(hasOfficialArm64Build(version), false);
          assert.equal(hasArm64MirrorBuild(version), false);

          // Use the high-level download + get functions that automatically
          // skip native on ARM64 for old versions and fall back to WASM.
          await downloadSolcCompilers(new Set([version]), true);
          const compiler = await getCompiler(version, { preferWasm: false });

          assert.ok(compiler.isSolcJs, "Should be a WASM compiler");
        });
      },
    );
  },
);
