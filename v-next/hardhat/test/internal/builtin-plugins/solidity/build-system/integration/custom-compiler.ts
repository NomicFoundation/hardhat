/* eslint-disable no-restricted-syntax -- test */
import type { Compiler } from "../../../../../../src/internal/builtin-plugins/solidity/build-system/compiler/compiler.js";
import type {
  CompilationJobCreationError,
  FileBuildResult,
} from "../../../../../../src/types/solidity.js";

import assert from "node:assert/strict";
import path from "node:path";
import { after, before, beforeEach, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  getTmpDir,
} from "@nomicfoundation/hardhat-test-utils";
import { remove } from "@nomicfoundation/hardhat-utils/fs";
import {
  resetMockCacheDir,
  setMockCacheDir,
} from "@nomicfoundation/hardhat-utils/global-dir";

import {
  CompilerDownloaderImplementation,
  CompilerPlatform,
} from "../../../../../../src/internal/builtin-plugins/solidity/build-system/compiler/downloader.js";
import {
  downloadConfiguredCompilers,
  getCompiler,
} from "../../../../../../src/internal/builtin-plugins/solidity/build-system/compiler/index.js";
import { createHardhatRuntimeEnvironment } from "../../../../../../src/internal/hre-initialization.js";
import { FileBuildResultType } from "../../../../../../src/types/solidity.js";
import { useTestProjectTemplate } from "../resolver/helpers.js";

describe(
  "Using a custom compiler",
  { skip: process.env.HARDHAT_DISABLE_SLOW_TESTS === "true" },
  function () {
    let nativeCompiler: Compiler;
    let wasmCompiler: Compiler;
    let testGlobalCacheRoot: string;

    const basicProjectTemplate = {
      name: "test",
      version: "1.0.0",
      files: {
        "contracts/Foo.sol": `// SPDX-License-Identifier: UNLICENSED\npragma solidity ^0.8.0; contract Foo {}`,
      },
    };

    const supportsNativeCompiler =
      CompilerDownloaderImplementation.getCompilerPlatform() !==
      CompilerPlatform.WASM;

    function assertCompilerSelection(
      compiler: Compiler,
      buildResult: CompilationJobCreationError | Map<string, FileBuildResult>,
    ) {
      assert(!("reason" in buildResult));
      const jobBuildResult = buildResult.values().next().value;
      assert(jobBuildResult !== undefined);
      assert(jobBuildResult.type === FileBuildResultType.BUILD_SUCCESS);

      const solcLongVersion = jobBuildResult.compilationJob.solcLongVersion;

      // This assertion means that the compiler used for compilation was the one specified in `path`, and not the
      // one that would be resolved normally (because we downloaded 0.8.26 and used it for 0.8.28)
      // ARM64 is a special case since their long version doesn't come in the list.json so we just compare short version
      if (
        CompilerDownloaderImplementation.getCompilerPlatform() ===
        CompilerPlatform.LINUX_ARM64
      ) {
        assert(solcLongVersion.startsWith(compiler.longVersion));
      } else {
        assert.equal(solcLongVersion, compiler.longVersion);
      }
    }

    // We download a specific version of native and WASM solc and use it for the tests
    before(async function () {
      // Set up isolated cache directory to avoid using/affecting the real global cache
      testGlobalCacheRoot = await getTmpDir("custom-compiler-test-cache");
      setMockCacheDir(testGlobalCacheRoot);

      await downloadConfiguredCompilers(new Set(["0.8.26"]), true);

      const potentiallyNativeCompiler = await getCompiler("0.8.26", {
        preferWasm: false,
      });

      if (!potentiallyNativeCompiler.isSolcJs) {
        nativeCompiler = potentiallyNativeCompiler;
      }

      const potentiallyWasmCompiler = await getCompiler("0.8.26", {
        preferWasm: true,
      });

      if (potentiallyWasmCompiler.isSolcJs) {
        wasmCompiler = potentiallyWasmCompiler;
      }
    });

    after(async function () {
      // Reset mock cache directory
      resetMockCacheDir();

      // Clean up temp directory
      await remove(testGlobalCacheRoot);
    });

    for (const compilerType of ["native", "wasm"]) {
      let compiler: Compiler;

      if (!supportsNativeCompiler && compilerType === "native") {
        continue;
      }

      beforeEach(async function () {
        compiler = compilerType === "native" ? nativeCompiler : wasmCompiler;
        assert.equal(compiler.isSolcJs, compilerType === "wasm");
      });

      describe(`Using a ${compilerType} compiler`, function () {
        // These tests inherently assert that getting version and compiler type (wasm/native) works

        it("can be specified on single version config", async function () {
          await using project =
            await useTestProjectTemplate(basicProjectTemplate);

          const hre = await createHardhatRuntimeEnvironment(
            {
              solidity: {
                version: "0.8.28",
                path: compiler.compilerPath, // we are using 0.8.26 compiler for 0.8.28 config, so we test the override
              },
            },
            {},
            project.path,
          );

          const result = await hre.solidity.build(
            [path.join(project.path, "contracts/Foo.sol")],
            { quiet: true },
          );

          assertCompilerSelection(compiler, result);
        });

        it("can be specified on multi version config", async function () {
          await using project =
            await useTestProjectTemplate(basicProjectTemplate);

          const hre = await createHardhatRuntimeEnvironment(
            {
              solidity: {
                compilers: [
                  {
                    version: "0.8.28",
                    path: compiler.compilerPath, // we are using 0.8.26 compiler for 0.8.28 config, so we test the override
                  },
                ],
              },
            },
            {},
            project.path,
          );

          const result = await hre.solidity.build(
            [path.join(project.path, "contracts/Foo.sol")],
            { quiet: true },
          );

          assertCompilerSelection(compiler, result);
        });

        it("can be specified on single-version build profile config", async function () {
          await using project =
            await useTestProjectTemplate(basicProjectTemplate);

          const hre = await createHardhatRuntimeEnvironment(
            {
              solidity: {
                profiles: {
                  default: {
                    version: "0.8.28",
                    path: compiler.compilerPath, // we are using 0.8.26 compiler for 0.8.28 config, so we test the override
                  },
                },
              },
            },
            {},
            project.path,
          );

          const result = await hre.solidity.build(
            [path.join(project.path, "contracts/Foo.sol")],
            { quiet: true },
          );

          assertCompilerSelection(compiler, result);
        });

        it("can be specified on multi-version build profile config", async function () {
          await using project =
            await useTestProjectTemplate(basicProjectTemplate);

          const hre = await createHardhatRuntimeEnvironment(
            {
              solidity: {
                profiles: {
                  default: {
                    compilers: [
                      {
                        version: "0.8.28",
                        path: compiler.compilerPath, // we are using 0.8.26 compiler for 0.8.28 config, so we test the override
                      },
                    ],
                  },
                },
              },
            },
            {},
            project.path,
          );

          const result = await hre.solidity.build(
            [path.join(project.path, "contracts/Foo.sol")],
            { quiet: true },
          );

          assertCompilerSelection(compiler, result);
        });

        it("can be specified on file overrides config", async function () {
          await using project =
            await useTestProjectTemplate(basicProjectTemplate);

          const hre = await createHardhatRuntimeEnvironment(
            {
              solidity: {
                profiles: {
                  default: {
                    compilers: [{ version: "0.8.28" }],

                    overrides: {
                      "contracts/Foo.sol": {
                        version: "0.8.28",
                        path: compiler.compilerPath,
                      },
                    },
                  },
                },
              },
            },
            {},
            project.path,
          );

          const result = await hre.solidity.build(
            [path.join(project.path, "contracts/Foo.sol")],
            { quiet: true },
          );

          assertCompilerSelection(compiler, result);
        });

        it("throws a descriptive error if the provided path doesn't exist", async () => {
          await using project =
            await useTestProjectTemplate(basicProjectTemplate);

          const hre = await createHardhatRuntimeEnvironment(
            {
              solidity: {
                version: "0.8.28",
                path: "/path/to/non-existent/compiler",
              },
            },
            {},
            project.path,
          );

          await assertRejectsWithHardhatError(
            hre.solidity.build([path.join(project.path, "contracts/Foo.sol")], {
              quiet: true,
            }),
            HardhatError.ERRORS.CORE.SOLIDITY.COMPILER_PATH_DOES_NOT_EXIST,
            {
              compilerPath: "/path/to/non-existent/compiler",
              version: "0.8.28",
            },
          );
        });
      });
    }
  },
);
