import { assert } from "chai";
import fsExtra from "fs-extra";
import path from "path";
import { ERRORS } from "../../../../src/internal/core/errors-list";
import {
  CompilerDownloader,
  CompilerPlatform,
} from "../../../../src/internal/solidity/compiler/downloader";
import { expectHardhatErrorAsync } from "../../../helpers/errors";
import { useTmpDir } from "../../../helpers/fs";
import { download } from "../../../../src/internal/util/download";

describe("Compiler downloader", function () {
  useTmpDir("compiler-downloader");

  let downloader: CompilerDownloader;

  beforeEach(async function () {
    const plaftorm = CompilerDownloader.getCompilerPlatform();
    downloader = new CompilerDownloader(plaftorm, this.tmpDir);

    assert.isFalse(await downloader.isCompilerDownloaded("0.4.12123"));
  });

  describe("isCompilerDownloaded (WASM)", function () {
    let wasmDownloader: CompilerDownloader;
    beforeEach(function () {
      wasmDownloader = new CompilerDownloader(
        CompilerPlatform.WASM,
        this.tmpDir
      );
    });

    it("should return false when version is bad", async function () {
      assert.isFalse(await wasmDownloader.isCompilerDownloaded("0.4.12123a"));
    });

    it("should return false when the compiler isn't downloaded yet", async function () {
      assert.isFalse(await wasmDownloader.isCompilerDownloaded("0.4.12"));
    });

    it("should return true when the compiler is already downloaded", async function () {
      await wasmDownloader.downloadCompiler("0.4.12");
      assert.isTrue(await wasmDownloader.isCompilerDownloaded("0.4.12"));
    });
  });

  describe("isCompilerDownloaded (native)", function () {
    it("should return false when version is bad", async function () {
      assert.isFalse(await downloader.isCompilerDownloaded("0.4.12123a"));
    });

    it("should return false when the compiler isn't downloaded yet", async function () {
      assert.isFalse(await downloader.isCompilerDownloaded("0.4.12"));
    });

    it("should return true when the compiler is already downloaded", async function () {
      await downloader.downloadCompiler("0.4.12");
      assert.isTrue(await downloader.isCompilerDownloaded("0.4.12"));
    });
  });

  describe("downloadCompiler", function () {
    it("Should throw if the version is invalid or doesn't exist", async function () {
      await expectHardhatErrorAsync(
        () => downloader.downloadCompiler("asd"),
        ERRORS.SOLC.INVALID_VERSION
      );

      await expectHardhatErrorAsync(
        () => downloader.downloadCompiler("100.0.0"),
        ERRORS.SOLC.INVALID_VERSION
      );
    });

    it("Should throw the right error if the list fails to be downloaded", async function () {
      const mockDownloader = new CompilerDownloader(
        CompilerPlatform.WASM,
        this.tmpDir,
        CompilerDownloader.defaultCompilerListCachePeriod,
        (_url, _filePath) => {
          throw new Error("download failed");
        }
      );

      await expectHardhatErrorAsync(
        () => mockDownloader.downloadCompiler("0.4.12"),
        ERRORS.SOLC.VERSION_LIST_DOWNLOAD_FAILED
      );
    });

    it("Should throw the right error when the compiler download fails", async function () {
      let hasDownloadedOnce = false;
      const mockDownloader = new CompilerDownloader(
        CompilerPlatform.WASM,
        this.tmpDir,
        CompilerDownloader.defaultCompilerListCachePeriod,
        (url, filePath, timeoutMillis) => {
          if (!hasDownloadedOnce) {
            hasDownloadedOnce = true;
            return download(url, filePath, timeoutMillis);
          }
          throw new Error("download failed");
        }
      );

      await expectHardhatErrorAsync(
        () => mockDownloader.downloadCompiler("0.4.12"),
        ERRORS.SOLC.DOWNLOAD_FAILED
      );
    });

    it("Shouldn't re-download the list", async function () {
      let downloads = 0;
      const mockDownloader = new CompilerDownloader(
        CompilerPlatform.WASM,
        this.tmpDir,
        CompilerDownloader.defaultCompilerListCachePeriod,
        (url, filePath, timeoutMillis) => {
          downloads++;
          return download(url, filePath, timeoutMillis);
        }
      );

      await mockDownloader.downloadCompiler("0.4.12");
      await mockDownloader.downloadCompiler("0.4.13");

      assert.equal(downloads, 3);
    });

    it("Should throw the right error and delete the compiler if the checksum fails", async function () {
      let stopMocking = false;
      let hasDownloadedOnce = false;
      let compilerPath: string | undefined;
      const mockDownloader = new CompilerDownloader(
        CompilerPlatform.WASM,
        this.tmpDir,
        CompilerDownloader.defaultCompilerListCachePeriod,
        async (url, filePath, timeoutMillis) => {
          if (stopMocking) {
            return download(url, filePath, timeoutMillis);
          }

          if (!hasDownloadedOnce) {
            hasDownloadedOnce = true;
            return download(url, filePath, timeoutMillis);
          }

          await fsExtra.createFile(filePath);
          compilerPath = filePath;
        }
      );

      await expectHardhatErrorAsync(
        () => mockDownloader.downloadCompiler("0.4.12"),
        ERRORS.SOLC.INVALID_DOWNLOAD
      );

      assert.isFalse(await fsExtra.pathExists(compilerPath!));

      // it should work with the normal download now
      stopMocking = true;
      await mockDownloader.downloadCompiler("0.4.12");
      assert.isTrue(await mockDownloader.isCompilerDownloaded("0.4.12"));
    });
  });

  describe("getCompiler", function () {
    it("should throw when trying to get a compiler that doesn't exist in the compiler list", async function () {
      await expectHardhatErrorAsync(
        () => downloader.getCompiler("0.0.1"),
        ERRORS.GENERAL.ASSERTION_ERROR
      );
    });

    it("should throw when trying to get a compiler that's in the compiler list but hasn't been downloaded yet", async function () {
      await downloader.downloadCompiler("0.4.12");

      await expectHardhatErrorAsync(
        () => downloader.getCompiler("0.4.13"),
        ERRORS.GENERAL.ASSERTION_ERROR
      );
    });

    it("should return undefined when the native compiler can't be run", async function () {
      let hasDownloadedOnce = false;
      const platform = CompilerDownloader.getCompilerPlatform();
      const mockDownloader = new CompilerDownloader(
        platform,
        this.tmpDir,
        CompilerDownloader.defaultCompilerListCachePeriod,
        async (_url, filePath, _timeoutMillis) => {
          if (!hasDownloadedOnce) {
            hasDownloadedOnce = true;
            const longVersion = "0.4.12+mock";
            const compilersList = {
              builds: [
                {
                  path:
                    platform === CompilerPlatform.WINDOWS ? "solc.exe" : "solc",
                  version: "0.4.12",
                  longVersion,
                  build: "build",
                  keccak256:
                    "0x87c2d362de99f75a4f2755cdaaad2d11bf6cc65dc71356593c445535ff28f43d",
                  urls: [],
                  platform,
                },
              ],
              releases: {
                "0.4.12": "0.4.12+mock",
              },
              latestRelease: "0.4.12",
            };

            await fsExtra.ensureDir(path.dirname(filePath));
            await fsExtra.writeJSON(filePath, compilersList);
            return;
          }

          await fsExtra.ensureDir(path.dirname(filePath));
          await fsExtra.writeFile(filePath, "asd");
        }
      );

      await mockDownloader.downloadCompiler("0.4.12");
      assert.isUndefined(await mockDownloader.getCompiler("0.4.12"));
    });

    it("should work for downloaded compilers", async function () {
      await downloader.downloadCompiler("0.4.12");
      assert.isDefined(downloader.getCompiler("0.4.12"));

      await downloader.downloadCompiler("0.4.13");
      assert.isDefined(downloader.getCompiler("0.4.13"));
    });
  });
});
