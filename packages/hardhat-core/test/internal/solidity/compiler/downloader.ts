import { assert } from "chai";
import fsExtra from "fs-extra";
import path from "path";

import { ERRORS } from "../../../../src/internal/core/errors-list";
import {
  // CompilerBuild,
  CompilerDownloader,
  CompilerPlatform,
  // CompilersList,
} from "../../../../src/internal/solidity/compiler/downloader";
import {
  expectHardhatErrorAsync,
  expectErrorAsync,
} from "../../../helpers/errors";
import { useTmpDir } from "../../../helpers/fs";

// The CompilerDownloader's logic is complex and has/depends on lots of
// side-effects. This is not ideal, but enables many optimizations. In
// particular, it doesn't download unnecessary files.
//
// To make it easier to test, CompilerDownloader exposes helper methods with
// internal logic and they are tested individually here.

describe("Compiler downloader", function () {
  // let localCompilerBuild: CompilerBuild;
  // let mockCompilerList: CompilersList;

  useTmpDir("compiler-downloader");

  before(function () {
    /*
    localCompilerBuild = {
      path: "soljson-v0.7.3+commit.9bfce1f6.js",
      version: "0.7.3",
      build: "commit.9bfce1f6",
      longVersion: "0.7.3+commit.9bfce1f6",
      keccak256:
        "0xcf099e7057d6c3d5acac1f4e349798ad5a581b6cb7ffcebdf5b37b86eac4872d",
      urls: [
        "bzzr://2f8ec45d2d7298ab1fa49f3568ada6c6e030c7dd7f490a1505ed9d4713d86dc8",
        "dweb:/ipfs/QmQMH2o7Nz3DaQ31hNYyHVAgejqTyZouvA35Zzzwe2UBPt",
      ],
      platform: CompilerPlatform.WASM,
    };

    mockCompilerList = {
      builds: [localCompilerBuild],
      releases: {
        [localCompilerBuild.version]: localCompilerBuild.path,
      },
      latestRelease: localCompilerBuild.version,
    };
    */
  });

  /*
  describe("Downloaded compiler verification", function () {
    it("Shouldn't do anything if the compiler is fine", async function () {
      const downloader = new CompilerDownloader(this.tmpDir, {
        download: async () => {
          throw new Error("This shouldn't be called");
        },
      });
      const compilerBin = require.resolve("solc/soljson.js");
      await downloader.verifyCompiler(localCompilerBuild, compilerBin);
    });

    it("Should throw if the download checksum verification fails, and delete it, and the compilers list", async function () {
      const compilersDir = this.tmpDir;

      const downloader = new CompilerDownloader(compilersDir, {
        download: async () => {
          throw new Error("Expected");
        },
      });

      const compilersList = downloader.getCompilersListPath(
        localCompilerBuild.platform
      );

      const corruptCompilerBin = path.join(compilersDir, "asd");

      await fsExtra.createFile(compilersList);
      await fsExtra.createFile(corruptCompilerBin);

      await expectHardhatErrorAsync(
        () => downloader.verifyCompiler(localCompilerBuild, corruptCompilerBin),
        ERRORS.SOLC.INVALID_DOWNLOAD
      );

      assert.isFalse(await fsExtra.pathExists(corruptCompilerBin));
      assert.isFalse(await fsExtra.pathExists(compilersList));
    });
  });
  */

  describe("isCompilerDownloaded", function () {
    it("should return false when version is bad", function () {});
    it("should return false when the compiler isn't downloaded yet", function () {});
    it("should return true when the compiler is already downloaded", function () {});
  });
  describe("downloadCompiler", function () {
    it("Should call download with the right params when trying to download the compiler list", async function () {
      const compilersDir = this.tmpDir;
      const expectedUrl = `https://binaries.soliditylang.org/wasm/list.json`;

      let urlUsed: string | undefined;
      let pathUsed: string | undefined;

      const downloader = new CompilerDownloader(
        CompilerPlatform.WASM,
        compilersDir,
        CompilerDownloader.defaultCompilerListCachePeriod,
        async (url, compilerPath) => {
          urlUsed = url;
          pathUsed = compilerPath;
        }
      );

      // invoke the download, but expect it to fail since our download function
      // above doesn't REALLY download anything, as we're just using it to
      // inspect the parameters it was given.
      await expectHardhatErrorAsync(
        () => downloader.downloadCompiler("0.8.16"),
        ERRORS.SOLC.INVALID_VERSION
      );

      assert.equal(urlUsed, expectedUrl);
      assert.equal(
        pathUsed,
        path.join(compilersDir, CompilerPlatform.WASM, "list.json")
      );
    });
    it("should call the download function with the right params when downloading the compiler", async function () {
      const compilersDir = this.tmpDir;
      const build = {
        path: "soljson-v0.8.16+commit.07a7930e.js",
        version: "0.8.16",
      };
      await fsExtra.outputJson(
        path.join(compilersDir, CompilerPlatform.WASM, "list.json"),
        { builds: [build] }
      );
      const downloadPath = path.join(compilersDir, "wasm", build.path);
      const expectedUrl = `https://binaries.soliditylang.org/wasm/${build.path}`;

      let urlUsed: string | undefined;
      let pathUsed: string | undefined;

      const downloader = new CompilerDownloader(
        CompilerPlatform.WASM,
        compilersDir,
        CompilerDownloader.defaultCompilerListCachePeriod,
        async (url, compilerPath) => {
          console.log(`inside download function`);
          urlUsed = url;
          pathUsed = compilerPath;
        }
      );

      // expect NOENT because it will try to validate the download but our
      // download function (given in the constructor to the class) didn't
      // actually download anything.
      await expectErrorAsync(
        () => downloader.downloadCompiler("0.8.16"),
        /ENOENT: no such file or directory/
      );

      assert.equal(urlUsed, expectedUrl);
      assert.equal(pathUsed, downloadPath);
    });
    it("should throw when there's already a compiler list downloaded but it doesn't include the requested version", async function () {
      const compilersDir = this.tmpDir;
      await fsExtra.outputJson(
        path.join(compilersDir, CompilerPlatform.WASM, "list.json"),
        { builds: [] }
      );

      const downloader = new CompilerDownloader(
        CompilerPlatform.WASM,
        compilersDir,
        CompilerDownloader.defaultCompilerListCachePeriod,
        async () => {
          throw new Error("This shouldn't be called");
        }
      );
      await expectHardhatErrorAsync(
        () => downloader.downloadCompiler("0.8.16"),
        ERRORS.SOLC.INVALID_VERSION
      );
    });
    it("should throw when an attempt to download a compiler list throws", async function () {
      const downloader = new CompilerDownloader(
        CompilerPlatform.WASM,
        this.tmpDir,
        CompilerDownloader.defaultCompilerListCachePeriod,
        async () => {
          throw new Error("Expected");
        }
      );

      await expectHardhatErrorAsync(
        () => downloader.downloadCompiler("0.8.16"),
        ERRORS.SOLC.VERSION_LIST_DOWNLOAD_FAILED
      );
    });
    it("should throw when a freshly downloaded compiler list doesn't include the requested version", function () {});
    it("should throw when an attempt to download a compiler throws", function () {});
    it("should throw when a downloaded compiler fails validation", function () {});
    it("should work", function () {});
  });
  describe("getCompiler", function () {
    it("should throw when trying to get a compiler that doesn't exist in the compiler list", function () {});
    it("should throw when trying to get a compiler that's in the compiler list but hasn't been downloaded yet", function () {});
    it("should work", function () {});
  });

  /*
  describe("Get compilers lists and CompilerBuild", function () {
    let compilersDir: string;
    let downloadCallCount: number;
    let successDownloadTry: number;
    let mockDownloader: CompilerDownloader;

    beforeEach(async function () {
      compilersDir = this.tmpDir;

      downloadCallCount = 0;
      successDownloadTry = 0;

      mockDownloader = new CompilerDownloader(compilersDir, {
        download: async () => {
          if (downloadCallCount >= successDownloadTry) {
            await saveMockCompilersList();
          } else {
            await saveMalformedCompilersList();
          }

          downloadCallCount++;
        },
        forceSolcJs: true,
      });
    });

    async function saveMalformedCompilersList() {
      await fsExtra.outputFile(
        path.join(compilersDir, CompilerPlatform.WASM, "list.json"),
        "{ malformed"
      );
    }

    async function saveMockCompilersList() {
      await fsExtra.outputJSON(
        path.join(compilersDir, CompilerPlatform.WASM, "list.json"),
        mockCompilerList
      );
    }

    describe("When there's an already downloaded list", function () {
      beforeEach(async function () {
        await saveMockCompilersList();
      });

      describe("getCompilersList", function () {
        it("Doesn't download the list again", async function () {
          await mockDownloader.getCompilersList(CompilerPlatform.WASM);
          assert.equal(downloadCallCount, 0);
        });

        it("Returns the right list", async function () {
          const list = await mockDownloader.getCompilersList(
            CompilerPlatform.WASM
          );
          assert.deepEqual(list, mockCompilerList);
        });
      });

      describe("getCompilerBuild", function () {
        describe("When the build is in the list", function () {
          it("Doesn't re-download the list", async function () {
            await mockDownloader.getCompilerBuild(localCompilerBuild.version);
            assert.equal(downloadCallCount, 0);
          });

          it("Returns the right build", async function () {
            const build = await mockDownloader.getCompilerBuild(
              localCompilerBuild.version
            );
            assert.deepEqual(build, localCompilerBuild);
          });
        });

        describe("When it isn't", function () {
          it("Downloads the build", async function () {
            try {
              await mockDownloader.getCompilerBuild("non-existent");
              assert.equal(downloadCallCount, 1);
            } catch (e) {
              // We ignore the error here, see next test.
            }
          });

          it("Throws the right error if the build is not included in the new list", async function () {
            await expectHardhatErrorAsync(
              () => mockDownloader.getCompilerBuild("non-existent"),
              ERRORS.SOLC.INVALID_VERSION
            );
          });
        });
      });
    });

    describe("When there isn't", function () {
      describe("getCompilersList", function () {
        it("Downloads the compilers list", async function () {
          await mockDownloader.getCompilersList(CompilerPlatform.WASM);
          assert.equal(downloadCallCount, 1);
        });
      });

      describe("getCompilerBuild", function () {
        it("Downloads the compilers list", async function () {
          await mockDownloader.getCompilerBuild(localCompilerBuild.version);
          assert.equal(downloadCallCount, 1);
        });
      });
    });

    describe("When there is but it is malformed", function () {
      beforeEach(async function () {
        await saveMalformedCompilersList();
      });

      describe("getCompilersList", function () {
        it("Redownloads the compilers list", async function () {
          await mockDownloader.getCompilersList(CompilerPlatform.WASM);
          assert.equal(downloadCallCount, 1);
        });
      });

      describe("getCompilerBuild", function () {
        it("Redownloads the compilers list", async function () {
          await mockDownloader.getCompilerBuild(localCompilerBuild.version);
          assert.equal(downloadCallCount, 1);
        });
      });
    });

    describe("When downloading fails", function () {
      describe("getCompilersList", function () {
        it("retries on a failed download", async function () {
          successDownloadTry = 1;

          await mockDownloader.getCompilersList(CompilerPlatform.WASM);
          assert.equal(downloadCallCount, 2);
        });

        it("errors on too many failed downloads", async function () {
          successDownloadTry = 999;

          await assert.isRejected(
            mockDownloader.getCompilersList(CompilerPlatform.WASM),
            SyntaxError
          );

          assert.equal(downloadCallCount, 4);
        });
      });

      describe("getCompilerBuild", function () {
        it("retries on a failed download", async function () {
          successDownloadTry = 1;

          await mockDownloader.getCompilerBuild(localCompilerBuild.version);
          assert.equal(downloadCallCount, 2);
        });

        it("errors on too many failed downloads", async function () {
          successDownloadTry = 999;

          await assert.isRejected(
            mockDownloader.getCompilersList(CompilerPlatform.WASM),
            SyntaxError
          );

          assert.equal(downloadCallCount, 4);
        });
      });
    });
  });
  */

  /*
  describe("getDownloadedCompilerPath", function () {
    let compilersDir: string;
    let downloadedPath: string;
    let downloadCalled: boolean;
    let mockDownloader: CompilerDownloader;

    beforeEach(async function () {
      compilersDir = this.tmpDir;

      downloadedPath = path.join(
        compilersDir,
        CompilerPlatform.WASM,
        localCompilerBuild.path
      );

      downloadCalled = false;
      await fsExtra.outputJSON(
        path.join(compilersDir, CompilerPlatform.WASM, "list.json"),
        mockCompilerList
      );

      mockDownloader = new CompilerDownloader(compilersDir, {
        download: async () => {
          downloadCalled = true;
          // Just create an empty file
          await fsExtra.createFile(downloadedPath);
        },
        forceSolcJs: true,
      });
    });

    describe("If the compiler already existed", function () {
      it("Should return it if it's passes the verification", async function () {
        const compilerBin = require.resolve("solc/soljson.js");
        await fsExtra.copy(compilerBin, downloadedPath);

        const compilerPathResult =
          await mockDownloader.getDownloadedCompilerPath(
            localCompilerBuild.version
          );
        assert.isDefined(compilerPathResult);
        assert.equal(compilerPathResult!.compilerPath, downloadedPath);
      });

      it("Should throw and delete it if it doesn't", async function () {
        await fsExtra.createFile(downloadedPath);

        await expectHardhatErrorAsync(
          () =>
            mockDownloader.getDownloadedCompilerPath(
              localCompilerBuild.version
            ),
          ERRORS.SOLC.INVALID_DOWNLOAD
        );

        assert.isFalse(await fsExtra.pathExists(downloadedPath));
      });
    });

    describe("If the compiler didn't exist", function () {
      it("should download and verify it", async function () {
        await expectHardhatErrorAsync(
          () =>
            mockDownloader.getDownloadedCompilerPath(
              localCompilerBuild.version
            ),
          ERRORS.SOLC.INVALID_DOWNLOAD
        );

        assert.isFalse(await fsExtra.pathExists(downloadedPath));
        assert.isTrue(downloadCalled);
      });
    });
  });
  */
});
