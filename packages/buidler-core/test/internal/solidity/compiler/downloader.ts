import { assert } from "chai";
import fsExtra from "fs-extra";
import path from "path";

import { ERRORS } from "../../../../src/internal/core/errors-list";
import {
  CompilerBuild,
  CompilerDownloader,
  CompilersList
} from "../../../../src/internal/solidity/compiler/downloader";
import { getLocalCompilerVersion } from "../../../helpers/compiler";
import { expectBuidlerErrorAsync } from "../../../helpers/errors";
import { useTmpDir } from "../../../helpers/fs";

// The CompilerDownloader's logic is complex and has/depends on lots of
// side-effects. This is not ideal, but enables many optimizations. In
// particular, it doesn't download unnecessary files.
//
// To make it easier to test, CompilerDownloader exposes helper methods with
// internal logic and their are tested individually here.

describe("Compiler downloader", function() {
  let localCompilerBuild: CompilerBuild;
  let mockCompilerList: CompilersList;

  useTmpDir("compiler-downloader");

  before(function() {
    localCompilerBuild = {
      path: "soljson-v0.5.11+commit.c082d0b4.js",
      version: "0.5.11",
      build: "commit.c082d0b4",
      longVersion: "0.5.11+commit.c082d0b4",
      keccak256:
        "0xc17ac23500f490e479bd4f82f7ac93111cb950af5b388d1002972d42613feda2",
      urls: [
        "bzzr://f7136a4e9d4771a12407ff4dd8a5932840a79d77cafed760caacaa63d7a60d81"
      ]
    };

    assert.equal(
      localCompilerBuild.version,
      getLocalCompilerVersion(),
      `The installed version doesn't match the CompilerBuild used for testing. Please update it in ${__filename}.`
    );

    mockCompilerList = {
      builds: [localCompilerBuild],
      releases: {
        [localCompilerBuild.version]: localCompilerBuild.path
      },
      latestRelease: localCompilerBuild.version
    };
  });

  describe("Downloaded compiler verification", function() {
    it("Shouldn't do anything if the compiler is fine", async function() {
      const downloader = new CompilerDownloader(
        this.tmpDir,
        getLocalCompilerVersion(),
        async () => {
          throw new Error("This shouldn't be called");
        }
      );
      const compilerBin = require.resolve("solc/soljson.js");
      await downloader.verifyCompiler(localCompilerBuild, compilerBin);
    });

    it("Should throw if the download was unsuccessful, and delete it", async function() {
      const compilersDir = this.tmpDir;
      const corruptCompilerBin = path.join(compilersDir, "asd");
      await fsExtra.createFile(corruptCompilerBin);

      const downloader = new CompilerDownloader(
        compilersDir,
        getLocalCompilerVersion(),
        async () => {
          throw new Error("Expected");
        }
      );

      await expectBuidlerErrorAsync(
        () => downloader.verifyCompiler(localCompilerBuild, corruptCompilerBin),
        ERRORS.SOLC.INVALID_DOWNLOAD
      );

      assert.isFalse(await fsExtra.pathExists(corruptCompilerBin));
    });
  });

  describe("Compiler download", function() {
    it("should call the download function with the right params", async function() {
      const compilersDir = this.tmpDir;
      const downloadPath = path.join(compilersDir, "downloadedCompiler");
      const expectedUrl = `https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/bin/${localCompilerBuild.path}`;

      let urlUsed: string | undefined;
      let pathUsed: string | undefined;

      const downloader = new CompilerDownloader(
        compilersDir,
        getLocalCompilerVersion(),
        async (url, compilerPath) => {
          urlUsed = url;
          pathUsed = compilerPath;
        }
      );

      await downloader.downloadCompiler(localCompilerBuild, downloadPath);

      assert.equal(urlUsed, expectedUrl);
      assert.equal(pathUsed, downloadPath);
    });

    it("Should throw the right error if the download fails", async function() {
      const compilersDir = this.tmpDir;
      const downloadPath = path.join(compilersDir, "downloadedCompiler");

      const downloader = new CompilerDownloader(
        compilersDir,
        getLocalCompilerVersion(),
        async (url, compilerPath) => {
          throw new Error("Expected");
        }
      );

      await expectBuidlerErrorAsync(
        () => downloader.downloadCompiler(localCompilerBuild, downloadPath),
        ERRORS.SOLC.DOWNLOAD_FAILED
      );
    });
  });

  describe("Compilers list download", function() {
    it("Should call download with the right params", async function() {
      const compilersDir = this.tmpDir;
      const expectedUrl = `https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/bin/list.json`;

      let urlUsed: string | undefined;
      let pathUsed: string | undefined;

      const downloader = new CompilerDownloader(
        compilersDir,
        getLocalCompilerVersion(),
        async (url, compilerPath) => {
          urlUsed = url;
          pathUsed = compilerPath;
        }
      );

      await downloader.downloadCompilersList();

      assert.equal(urlUsed, expectedUrl);
      assert.equal(pathUsed, path.join(compilersDir, "list.json"));
    });

    it("Should throw the right error if the download fails", async function() {
      const downloader = new CompilerDownloader(
        this.tmpDir,
        getLocalCompilerVersion(),
        async (url, compilerPath) => {
          throw new Error("Expected");
        }
      );

      await expectBuidlerErrorAsync(
        () => downloader.downloadCompilersList(),
        ERRORS.SOLC.VERSION_LIST_DOWNLOAD_FAILED
      );
    });
  });

  describe("Compilers list exists", function() {
    it("Should return true if it does", async function() {
      const compilersDir = this.tmpDir;
      await fsExtra.createFile(path.join(compilersDir, "list.json"));

      const downloader = new CompilerDownloader(
        compilersDir,
        getLocalCompilerVersion(),
        async () => {
          throw new Error("This shouldn't be called");
        }
      );
      assert.isTrue(await downloader.compilersListExists());
    });

    it("should return false if it doesn't", async function() {
      const downloader = new CompilerDownloader(
        this.tmpDir,
        getLocalCompilerVersion(),
        async () => {
          throw new Error("This shouldn't be called");
        }
      );
      assert.isFalse(await downloader.compilersListExists());
    });
  });

  describe("Get compilers lists and CompilerBuild", function() {
    let compilersDir: string;
    let downloadCalled: boolean;
    let mockDownloader: CompilerDownloader;

    beforeEach(async function() {
      compilersDir = this.tmpDir;

      downloadCalled = false;

      mockDownloader = new CompilerDownloader(
        compilersDir,
        getLocalCompilerVersion(),
        async () => {
          downloadCalled = true;
          await saveMockCompilersList();
        }
      );
    });

    async function saveMockCompilersList() {
      await fsExtra.outputJSON(
        path.join(compilersDir, "list.json"),
        mockCompilerList
      );
    }

    describe("When there's an already downloaded list", function() {
      beforeEach(async function() {
        await saveMockCompilersList();
      });

      describe("getCompilersList", function() {
        it("Doesn't download the list again", async function() {
          await mockDownloader.getCompilersList();
          assert.isFalse(downloadCalled);
        });

        it("Returns the right list", async function() {
          const list = await mockDownloader.getCompilersList();
          assert.deepEqual(list, mockCompilerList);
        });
      });

      describe("getCompilerBuild", function() {
        describe("When the build is in the list", function() {
          it("Doesn't re-download the list", async function() {
            await mockDownloader.getCompilerBuild(localCompilerBuild.version);
            assert.isFalse(downloadCalled);
          });

          it("Returns the right build", async function() {
            const build = await mockDownloader.getCompilerBuild(
              localCompilerBuild.version
            );
            assert.deepEqual(build, localCompilerBuild);
          });
        });

        describe("When it isn't", function() {
          it("Downloads the build", async function() {
            try {
              await mockDownloader.getCompilerBuild("non-existent");
              assert.isTrue(downloadCalled);
            } catch (e) {
              // We ignore the error here, see next test.
            }
          });

          it("Throws the right error if the build is not included in the new list", async function() {
            await expectBuidlerErrorAsync(
              () => mockDownloader.getCompilerBuild("non-existent"),
              ERRORS.SOLC.INVALID_VERSION
            );
          });
        });
      });
    });

    describe("When there isn't", function() {
      describe("getCompilersList", function() {
        it("Downloads the compilers list", async function() {
          await mockDownloader.getCompilersList();
          assert.isTrue(downloadCalled);
        });
      });

      describe("getCompilerBuild", function() {
        it("Downloads the compilers list", async function() {
          await mockDownloader.getCompilerBuild(localCompilerBuild.version);
          assert.isTrue(downloadCalled);
        });
      });
    });
  });

  describe("getDownloadedCompilerPath", function() {
    let compilersDir: string;
    let downloadedPath: string;
    let downloadCalled: boolean;
    let mockDownloader: CompilerDownloader;

    beforeEach(async function() {
      compilersDir = this.tmpDir;

      downloadedPath = path.join(compilersDir, localCompilerBuild.path);

      downloadCalled = false;
      await fsExtra.outputJSON(
        path.join(compilersDir, "list.json"),
        mockCompilerList
      );

      mockDownloader = new CompilerDownloader(
        compilersDir,
        getLocalCompilerVersion(),
        async () => {
          downloadCalled = true;
          // Just create an empty file
          await fsExtra.createFile(downloadedPath);
        }
      );
    });

    describe("If the compiler already existed", function() {
      it("Should return it if it's passes the verification", async function() {
        const compilerBin = require.resolve("solc/soljson.js");
        await fsExtra.copy(compilerBin, downloadedPath);

        const compilerPath = await mockDownloader.getDownloadedCompilerPath(
          localCompilerBuild.version
        );
        assert.equal(compilerPath, downloadedPath);
      });

      it("Should throw and delete it if it doesn't", async function() {
        await fsExtra.createFile(downloadedPath);

        await expectBuidlerErrorAsync(
          () =>
            mockDownloader.getDownloadedCompilerPath(
              localCompilerBuild.version
            ),
          ERRORS.SOLC.INVALID_DOWNLOAD
        );

        assert.isFalse(await fsExtra.pathExists(downloadedPath));
      });
    });

    describe("If the compiler didn't exist", function() {
      it("should download and verify it", async function() {
        await expectBuidlerErrorAsync(
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
});
