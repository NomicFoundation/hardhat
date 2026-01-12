import assert from "node:assert/strict";
import path from "node:path";
import { beforeEach, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  useTmpDir,
} from "@nomicfoundation/hardhat-test-utils";
import { sha256 } from "@nomicfoundation/hardhat-utils/crypto";
import * as fs from "@nomicfoundation/hardhat-utils/fs";
import { bytesToHexString } from "@nomicfoundation/hardhat-utils/hex";
import { download } from "@nomicfoundation/hardhat-utils/request";

import {
  CompilerDownloaderImplementation as CompilerDownloader,
  CompilerPlatform,
} from "../../../../../../src/internal/builtin-plugins/solidity/build-system/compiler/downloader.js";

describe(
  "Compiler downloader",
  {
    skip: process.env.HARDHAT_DISABLE_SLOW_TESTS === "true",
  },
  function () {
    useTmpDir("compiler-downloader");

    describe("isCompilerDownloaded (WASM)", function () {
      let wasmDownloader: CompilerDownloader;

      beforeEach(async function () {
        wasmDownloader = new CompilerDownloader(
          CompilerPlatform.WASM,
          process.cwd(),
        );

        await wasmDownloader.updateCompilerListIfNeeded(new Set([]));
      });

      it("should throw when version is bad", async function () {
        await assertRejectsWithHardhatError(
          () => wasmDownloader.isCompilerDownloaded("0.5.0a"),
          HardhatError.ERRORS.CORE.SOLIDITY.INVALID_SOLC_VERSION,
          {
            version: "0.5.0a",
          },
        );
      });

      it("should return false when the compiler isn't downloaded yet", async function () {
        assert.ok(
          !(await wasmDownloader.isCompilerDownloaded("0.5.0")),
          "Compiler should not be downloaded",
        );
      });

      it("should return true when the compiler is already downloaded", async function () {
        await wasmDownloader.updateCompilerListIfNeeded(new Set(["0.5.0"]));
        assert.ok(
          await wasmDownloader.downloadCompiler("0.5.0"),
          "Downloading compiler should succeed",
        );
        assert.ok(
          await wasmDownloader.isCompilerDownloaded("0.5.0"),
          "Compiler should be downloaded",
        );
      });
    });

    describe("isCompilerDownloaded (native)", function () {
      let downloader: CompilerDownloader;

      beforeEach(async function () {
        const platform = CompilerDownloader.getCompilerPlatform();
        downloader = new CompilerDownloader(platform, process.cwd());

        await downloader.updateCompilerListIfNeeded(new Set([]));
      });

      it("should throw when version is bad", async function () {
        await assertRejectsWithHardhatError(
          () => downloader.isCompilerDownloaded("0.5.0a"),
          HardhatError.ERRORS.CORE.SOLIDITY.INVALID_SOLC_VERSION,
          {
            version: "0.5.0a",
          },
        );
      });

      it("should return false when the compiler isn't downloaded yet", async function () {
        assert.ok(
          !(await downloader.isCompilerDownloaded("0.5.0")),
          "Compiler should not be downloaded",
        );
      });

      it("should return true when the compiler is already downloaded", async function () {
        await downloader.updateCompilerListIfNeeded(new Set(["0.5.0"]));
        assert.ok(
          await downloader.downloadCompiler("0.5.0"),
          "Downloading compiler should succeed",
        );
        assert.ok(
          await downloader.isCompilerDownloaded("0.5.0"),
          "Compiler should be downloaded",
        );
      });
    });

    describe("downloadCompiler", function () {
      let downloader: CompilerDownloader;

      beforeEach(async function () {
        const platform = CompilerDownloader.getCompilerPlatform();
        downloader = new CompilerDownloader(platform, process.cwd());

        await downloader.updateCompilerListIfNeeded(new Set([]));
      });

      it("Should throw if the version is invalid or doesn't exist", async function () {
        await downloader.updateCompilerListIfNeeded(
          new Set(["asd", "100.0.0"]),
        );

        await assertRejectsWithHardhatError(
          () => downloader.downloadCompiler("asd"),
          HardhatError.ERRORS.CORE.SOLIDITY.INVALID_SOLC_VERSION,
          {
            version: "asd",
          },
        );

        await assertRejectsWithHardhatError(
          () => downloader.downloadCompiler("100.0.0"),
          HardhatError.ERRORS.CORE.SOLIDITY.INVALID_SOLC_VERSION,
          {
            version: "100.0.0",
          },
        );
      });

      it("Should throw the right error if the list fails to be downloaded", async function () {
        const mockDownloader = new CompilerDownloader(
          CompilerPlatform.WASM,
          process.cwd(),
          (_url, _destination, _requestOptions, _dispatcherOptions) => {
            throw new Error("download failed");
          },
        );

        await assertRejectsWithHardhatError(
          () => mockDownloader.updateCompilerListIfNeeded(new Set(["0.5.0"])),
          HardhatError.ERRORS.CORE.SOLIDITY.VERSION_LIST_DOWNLOAD_FAILED,
          {},
        );
      });

      it("Should throw the right error when the compiler download fails", async function () {
        let hasDownloadedOnce = false;
        const mockDownloader = new CompilerDownloader(
          CompilerPlatform.WASM,
          process.cwd(),
          (url, destination, requestOptions, dispatcherOptions) => {
            if (!hasDownloadedOnce) {
              hasDownloadedOnce = true;
              return download(
                url,
                destination,
                requestOptions,
                dispatcherOptions,
              );
            }
            throw new Error("download failed");
          },
        );

        await mockDownloader.updateCompilerListIfNeeded(new Set(["0.5.0"]));

        await assertRejectsWithHardhatError(
          () => mockDownloader.downloadCompiler("0.5.0"),
          HardhatError.ERRORS.CORE.SOLIDITY.DOWNLOAD_FAILED,
          {
            remoteVersion: "0.5.0+commit.1d4f565a",
          },
        );
      });

      it("Shouldn't re-download the list", async function () {
        let downloads = 0;
        const mockDownloader = new CompilerDownloader(
          CompilerPlatform.WASM,
          process.cwd(),
          (url, destination, requestOptions, dispatcherOptions) => {
            downloads++;
            return download(
              url,
              destination,
              requestOptions,
              dispatcherOptions,
            );
          },
        );

        await mockDownloader.updateCompilerListIfNeeded(
          new Set(["0.5.0", "0.5.1"]),
        );

        await mockDownloader.downloadCompiler("0.5.0");
        await mockDownloader.downloadCompiler("0.5.1");

        // NOTE: 1 download is done for the list, and 2 downloads are done for
        // the compilers.
        assert.equal(downloads, 3);
      });

      it("Should throw the right error and delete the compiler if the checksum fails", async function () {
        let stopMocking = false;
        let hasDownloadedOnce = false;
        let compilerPath: string | undefined;
        const mockDownloader = new CompilerDownloader(
          CompilerPlatform.WASM,
          process.cwd(),
          async (url, destination, requestOptions, dispatcherOptions) => {
            if (stopMocking) {
              return download(
                url,
                destination,
                requestOptions,
                dispatcherOptions,
              );
            }

            if (!hasDownloadedOnce) {
              hasDownloadedOnce = true;
              return download(
                url,
                destination,
                requestOptions,
                dispatcherOptions,
              );
            }

            await fs.createFile(destination);
            compilerPath = destination;
          },
        );

        await mockDownloader.updateCompilerListIfNeeded(new Set(["0.5.0"]));

        await assertRejectsWithHardhatError(
          () => mockDownloader.downloadCompiler("0.5.0"),
          HardhatError.ERRORS.CORE.SOLIDITY.INVALID_DOWNLOAD,
          {
            remoteVersion: "0.5.0+commit.1d4f565a",
          },
        );

        assert.ok(
          compilerPath !== undefined,
          "Compiler path should be defined",
        );
        assert.ok(
          !(await fs.exists(compilerPath)),
          "Compiler should not be downloaded",
        );

        // it should work with the normal download now
        stopMocking = true;
        await mockDownloader.downloadCompiler("0.5.0");
        assert.ok(
          await mockDownloader.isCompilerDownloaded("0.5.0"),
          "Compiler should be downloaded",
        );
      });

      describe("multiple downloads", function () {
        it("should not download multiple times the same compiler", async function () {
          // The intention is for the value to be 1 if the compiler is downloaded only once.
          // Without a mutex, the value would be 10 because the compiler would be downloaded multiple times.
          // However, the check is implemented to ensure that the value remains 1.

          const VERSION = "0.5.0";

          let downloads = 0;
          const mockDownloader = new CompilerDownloader(
            CompilerPlatform.WASM,
            process.cwd(),
            (url, destination, requestOptions, dispatcherOptions) => {
              downloads++;
              return download(
                url,
                destination,
                requestOptions,
                dispatcherOptions,
              );
            },
          );

          await mockDownloader.updateCompilerListIfNeeded(new Set([VERSION]));

          const promises = [];
          for (let i = 0; i < 10; i++) {
            promises.push(mockDownloader.downloadCompiler(VERSION));
          }
          await Promise.all(promises);

          assert.ok(
            (await mockDownloader.getCompiler(VERSION)) !== undefined,
            "Compiler version should be defined",
          );

          // NOTE: 1 download is done for the list, and 1 download is done for
          // the compiler.
          assert.equal(downloads, 2);
        });

        it("should download multiple different compilers", async function () {
          const VERSIONS = ["0.5.1", "0.5.2", "0.5.3", "0.5.4", "0.5.5"];

          let downloads = 0;
          const mockDownloader = new CompilerDownloader(
            CompilerPlatform.WASM,
            process.cwd(),
            (url, destination, requestOptions, dispatcherOptions) => {
              downloads++;
              return download(
                url,
                destination,
                requestOptions,
                dispatcherOptions,
              );
            },
          );

          await mockDownloader.updateCompilerListIfNeeded(new Set(VERSIONS));

          const promises = [];
          for (const version of VERSIONS) {
            promises.push(mockDownloader.downloadCompiler(version));
          }

          await Promise.all(promises);

          for (const version of VERSIONS) {
            assert.ok(
              (await mockDownloader.getCompiler(version)) !== undefined,
              "Compiler version should be defined",
            );
          }

          // NOTE: 1 download is done for the list, and VERSIONS.length downloads
          // are done for the compilers.
          assert.equal(downloads, VERSIONS.length + 1);
        });
      });
    });

    describe("getCompiler", function () {
      let downloader: CompilerDownloader;

      beforeEach(async function () {
        const platform = CompilerDownloader.getCompilerPlatform();
        downloader = new CompilerDownloader(platform, process.cwd());

        await downloader.updateCompilerListIfNeeded(new Set([]));
      });

      it("should throw when trying to get a compiler that doesn't exist in the compiler list", async function () {
        await downloader.updateCompilerListIfNeeded(new Set([]));

        await assertRejectsWithHardhatError(
          () => downloader.getCompiler("0.5.0"),
          HardhatError.ERRORS.CORE.INTERNAL.ASSERTION_ERROR,
          {
            message: "Trying to get a compiler 0.5.0 before it was downloaded",
          },
        );
      });

      it("should throw when trying to get a compiler that's in the compiler list but hasn't been downloaded yet", async function () {
        await downloader.updateCompilerListIfNeeded(
          new Set(["0.5.0", "0.5.1"]),
        );

        await downloader.downloadCompiler("0.5.0");

        await assertRejectsWithHardhatError(
          () => downloader.getCompiler("0.5.1"),
          HardhatError.ERRORS.CORE.INTERNAL.ASSERTION_ERROR,
          {
            message: "Trying to get a compiler 0.5.1 before it was downloaded",
          },
        );
      });

      it("should throw if the native compiler can't be verified", async function () {
        let hasDownloadedOnce = false;
        const platform = CompilerDownloader.getCompilerPlatform();
        const mockDownloader = new CompilerDownloader(
          platform,
          process.cwd(),
          async (_url, destination, _requestOptions, _dispatcherOptions) => {
            if (!hasDownloadedOnce) {
              hasDownloadedOnce = true;
              const longVersion = "0.5.0+mock";
              const compilersList = {
                builds: [
                  {
                    path:
                      platform === CompilerPlatform.WINDOWS
                        ? "solc.exe"
                        : "solc",
                    version: "0.5.0",
                    longVersion,
                    build: "build",
                    keccak256:
                      "0x87c2d362de99f75a4f2755cdaaad2d11bf6cc65dc71356593c445535ff28f43d",
                    urls: [],
                    platform,
                  },
                ],
                releases: {
                  "0.5.0": "0.5.0+mock",
                },
                latestRelease: "0.5.0",
              };

              await fs.ensureDir(path.dirname(destination));
              await fs.writeJsonFile(destination, compilersList);
              return;
            }

            await fs.ensureDir(path.dirname(destination));
            await fs.writeUtf8File(destination, "asd");
          },
        );

        await mockDownloader.updateCompilerListIfNeeded(new Set(["0.5.0"]));

        const remoteVersion =
          platform === CompilerPlatform.LINUX_ARM64
            ? "0.5.0"
            : "0.5.0+commit.1d4f565a";
        await assertRejectsWithHardhatError(
          () => mockDownloader.downloadCompiler("0.5.0"),
          HardhatError.ERRORS.CORE.SOLIDITY.INVALID_DOWNLOAD,
          {
            remoteVersion,
          },
        );
      });

      it("should work for downloaded compilers", async function () {
        await downloader.updateCompilerListIfNeeded(
          new Set(["0.5.0", "0.5.1"]),
        );

        await downloader.downloadCompiler("0.5.0");
        assert.ok(
          downloader.getCompiler("0.5.0") !== undefined,
          "Compiler should be defined",
        );

        await downloader.downloadCompiler("0.5.1");
        assert.ok(
          downloader.getCompiler("0.5.1") !== undefined,
          "Compiler should be defined",
        );
      });

      it("should work if there are prereleases in the list", async () => {
        // skip test if we are in linux arm, which doesn't have 0.8.31 yet
        if (
          CompilerDownloader.getCompilerPlatform() ===
          CompilerPlatform.LINUX_ARM64
        ) {
          return;
        }

        await downloader.updateCompilerListIfNeeded(new Set(["0.8.31"]));
        await downloader.downloadCompiler("0.8.31");
        const compiler = await downloader.getCompiler("0.8.31");

        assert.ok(compiler !== undefined, "Compiler should be defined");
        assert.equal(compiler.version, "0.8.31");
        assert.equal(compiler.longVersion, "0.8.31+commit.fd3a2265");
      });
    });

    describe("when on linux-arm64", function () {
      let downloader: CompilerDownloader;

      beforeEach(async () => {
        downloader = new CompilerDownloader(
          CompilerPlatform.LINUX_ARM64,
          process.cwd(),
        );
      });

      describe("updateCompilerListIfNeeded", function () {
        it("downloads the list.json file from the linux-arm64 repo and populates the expected fields", async () => {
          await downloader.updateCompilerListIfNeeded(new Set(["0.8.28"]));

          const compilerList: any = await fs.readJsonFile(
            path.join(process.cwd(), "linux-arm64", "list.json"),
          );

          const build = compilerList.builds.find(
            (b: any) => b.version === "0.8.28",
          );

          assert.deepEqual(build, {
            version: "0.8.28",
            longVersion: "0.8.28",
            path: "solc-v0.8.28",
            url: "https://solc-linux-arm64-mirror.hardhat.org/linux/aarch64",
            sha256:
              "891ecdd8f92a8211ee99f21bc3052b63fa098b4807f21ed8311d66e35d5aeb84",
          });
        });
      });

      describe("downloadCompiler", function () {
        it("downloads the compiler from the linux-arm64 repo", async () => {
          await downloader.updateCompilerListIfNeeded(new Set(["0.8.28"]));
          await downloader.downloadCompiler("0.8.28");

          const binaryPath = path.join(
            process.cwd(),
            "linux-arm64",
            "solc-v0.8.28",
          );
          // Check the binary exists
          assert(await fs.exists(binaryPath), "binary should exist");

          // Check the sha256 matches
          assert.equal(
            bytesToHexString(await sha256(await fs.readBinaryFile(binaryPath))),
            "0x891ecdd8f92a8211ee99f21bc3052b63fa098b4807f21ed8311d66e35d5aeb84",
          );
        });
      });

      describe("getCompiler", function () {
        it("gets the compiler", async () => {
          await downloader.updateCompilerListIfNeeded(new Set(["0.8.28"]));
          await downloader.downloadCompiler("0.8.28");

          // Trick the system by deleting the .does.not.work file, because this test might not be running on an arm64 linux machine
          const binaryPath = path.join(
            process.cwd(),
            "linux-arm64",
            "solc-v0.8.28",
          );
          await fs.remove(`${binaryPath}.does.not.work`);

          const compiler = await downloader.getCompiler("0.8.28");

          if (compiler === undefined) {
            assert.fail("getCompiler returned undefined");
          }

          assert.equal(compiler.compilerPath, binaryPath);
          assert.equal(compiler.isSolcJs, false);
          assert.equal(compiler.longVersion, "0.8.28");
          assert.equal(compiler.version, "0.8.28");
        });
      });
    });
  },
);
