import {
  CompilerBuild,
  CompilerDownloader,
  CompilersList
} from "../../../src/solidity/compiler/downloader";
import { assert } from "chai";
import * as os from "os";
import fsExtra from "fs-extra";
import { expectBuidlerErrorAsync } from "../../helpers/errors";
import { ERRORS } from "../../../src/core/errors";
import { getLocalCompilerVersion } from "../../helpers/compiler";

// The CompilerDownloader's logic is complex and has/depends on lots of
// side-effects. This is not ideal, but enables many optimizations. In
// particular, it doesn't download unnecessary files.
//
// To make it easier to test, CompilerDownloader exposes helper methods with
// internal logic and their are tested individually here.

async function getEmptyTmpDir() {
  const tmpDir = os.tmpdir();
  const dir = tmpDir + "/buidler-compiler-downloader-tests";
  await fsExtra.ensureDir(dir);
  await fsExtra.emptyDir(dir);

  return dir;
}

describe("Compiler downloader", () => {
  let localCompilerBuild: CompilerBuild;
  let mockCompilerList: CompilersList;

  before(() => {
    localCompilerBuild = {
      path: "soljson-v0.5.1+commit.c8a2cb62.js",
      version: "0.5.1",
      build: "commit.c8a2cb62",
      longVersion: "0.5.1+commit.c8a2cb62",
      keccak256:
        "0xc90ad3242c8b9c0911c79e65d466b3ed3fadc74c142de2f40e7aa1ea7ef937a2",
      urls: [
        "bzzr://10e1cf972e0330409b59fc02157698209410534262ec5598db11480a42c6925c"
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

  describe("Downloaded compiler verification", () => {
    it("Shouldn't do anything if the compiler is fine", async () => {
      const downloader = new CompilerDownloader(
        await getEmptyTmpDir(),
        getLocalCompilerVersion(),
        async () => {
          throw new Error("This shouldn't be called");
        }
      );
      const compilerBin = require.resolve("solc/soljson.js");
      await downloader.verifyCompiler(localCompilerBuild, compilerBin);
    });

    it("Should throw if the download was unsuccessful, and delete it", async () => {
      const compilersDir = await getEmptyTmpDir();
      const corruptCompilerBin = compilersDir + "/asd";
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
        ERRORS.COMPILER_INVALID_DOWNLOAD
      );

      assert.isFalse(await fsExtra.pathExists(corruptCompilerBin));
    });
  });

  describe("Compiler download", () => {
    it("should call the download function with the right params", async () => {
      const compilersDir = await getEmptyTmpDir();
      const downloadPath = compilersDir + "/downloadedCompiler";
      const expectedUrl = `https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/bin/${
        localCompilerBuild.path
      }`;

      let urlUsed: string | undefined;
      let pathUsed: string | undefined;

      const downloader = new CompilerDownloader(
        compilersDir,
        getLocalCompilerVersion(),
        async (url, path) => {
          (urlUsed = url), (pathUsed = path);
        }
      );

      await downloader.downloadCompiler(localCompilerBuild, downloadPath);

      assert.equal(urlUsed, expectedUrl);
      assert.equal(pathUsed, downloadPath);
    });

    it("Should throw the right error if the download fails", async () => {
      const compilersDir = await getEmptyTmpDir();
      const downloadPath = compilersDir + "/downloadedCompiler";

      const downloader = new CompilerDownloader(
        compilersDir,
        getLocalCompilerVersion(),
        async (url, path) => {
          throw new Error("Expected");
        }
      );

      await expectBuidlerErrorAsync(
        () => downloader.downloadCompiler(localCompilerBuild, downloadPath),
        ERRORS.COMPILER_DOWNLOAD_FAILED
      );
    });
  });

  describe("Compilers list download", () => {
    it("Should call download with the right params", async () => {
      const compilersDir = await getEmptyTmpDir();
      const expectedUrl = `https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/bin/list.json`;

      let urlUsed: string | undefined;
      let pathUsed: string | undefined;

      const downloader = new CompilerDownloader(
        compilersDir,
        getLocalCompilerVersion(),
        async (url, path) => {
          (urlUsed = url), (pathUsed = path);
        }
      );

      await downloader.downloadCompilersList();

      assert.equal(urlUsed, expectedUrl);
      assert.equal(pathUsed, compilersDir);
    });

    it("Should throw the right error if the download fails", async () => {
      const downloader = new CompilerDownloader(
        await getEmptyTmpDir(),
        getLocalCompilerVersion(),
        async (url, path) => {
          throw new Error("Expected");
        }
      );

      await expectBuidlerErrorAsync(
        () => downloader.downloadCompilersList(),
        ERRORS.COMPILER_VERSION_LIST_DOWNLOAD_FAILED
      );
    });
  });

  describe("Compilers list exists", () => {
    it("Should return true if it does", async () => {
      const compilersDir = await getEmptyTmpDir();
      await fsExtra.createFile(compilersDir + "/list.json");

      const downloader = new CompilerDownloader(
        compilersDir,
        getLocalCompilerVersion(),
        async () => {
          throw new Error("This shouldn't be called");
        }
      );
      assert.isTrue(await downloader.compilersListExists());
    });

    it("should return false if it doesn't", async () => {
      const downloader = new CompilerDownloader(
        await getEmptyTmpDir(),
        getLocalCompilerVersion(),
        async () => {
          throw new Error("This shouldn't be called");
        }
      );
      assert.isFalse(await downloader.compilersListExists());
    });
  });

  describe("Get compilers lists and CompilerBuild", () => {
    let compilersDir: string;
    let downloadCalled: boolean;
    let mockDownloader: CompilerDownloader;

    beforeEach(async () => {
      compilersDir = await getEmptyTmpDir();

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
      await fsExtra.outputJSON(compilersDir + "/list.json", mockCompilerList);
    }

    describe("When there's an already downloaded list", () => {
      beforeEach(async () => {
        await saveMockCompilersList();
      });

      describe("getCompilersList", () => {
        it("Doesn't download the list again", async () => {
          await mockDownloader.getCompilersList();
          assert.isFalse(downloadCalled);
        });

        it("Returns the right list", async () => {
          const list = await mockDownloader.getCompilersList();
          assert.deepEqual(list, mockCompilerList);
        });
      });

      describe("getCompilerBuild", () => {
        describe("When the build is in the list", () => {
          it("Doesn't re-download the list", async () => {
            await mockDownloader.getCompilerBuild(localCompilerBuild.version);
            assert.isFalse(downloadCalled);
          });

          it("Returns the right build", async () => {
            const build = await mockDownloader.getCompilerBuild(
              localCompilerBuild.version
            );
            assert.deepEqual(build, localCompilerBuild);
          });
        });

        describe("When it isn't", () => {
          it("Downloads the build", async () => {
            try {
              await mockDownloader.getCompilerBuild("non-existent");
              assert.isTrue(downloadCalled);
            } catch (e) {
              // We ignore the error here, see next test.
            }
          });

          it("Throws the right error if the build is not included in the new list", async () => {
            await expectBuidlerErrorAsync(
              () => mockDownloader.getCompilerBuild("non-existent"),
              ERRORS.COMPILER_INVALID_VERSION
            );
          });
        });
      });
    });

    describe("When there isn't", () => {
      describe("getCompilersList", () => {
        it("Downloads the compilers list", async () => {
          await mockDownloader.getCompilersList();
          assert.isTrue(downloadCalled);
        });
      });

      describe("getCompilerBuild", () => {
        it("Downloads the compilers list", async () => {
          await mockDownloader.getCompilerBuild(localCompilerBuild.version);
          assert.isTrue(downloadCalled);
        });
      });
    });
  });

  describe("getDownloadedCompilerPath", () => {
    let compilersDir: string;
    let downloadedPath: string;
    let downloadCalled: boolean;
    let mockDownloader: CompilerDownloader;

    beforeEach(async () => {
      compilersDir = await getEmptyTmpDir();

      downloadedPath = compilersDir + "/" + localCompilerBuild.path;

      downloadCalled = false;
      await fsExtra.outputJSON(compilersDir + "/list.json", mockCompilerList);

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

    describe("If the compiler already existed", () => {
      it("Should return it if it's passes the verification", async () => {
        const compilerBin = require.resolve("solc/soljson.js");
        await fsExtra.copy(compilerBin, downloadedPath);

        const path = await mockDownloader.getDownloadedCompilerPath(
          localCompilerBuild.version
        );
        assert.equal(path, downloadedPath);
      });

      it("Should throw and delete it if it doesn't", async () => {
        await fsExtra.createFile(downloadedPath);

        await expectBuidlerErrorAsync(
          () =>
            mockDownloader.getDownloadedCompilerPath(
              localCompilerBuild.version
            ),
          ERRORS.COMPILER_INVALID_DOWNLOAD
        );

        assert.isFalse(await fsExtra.pathExists(downloadedPath));
      });
    });

    describe("If the compiler didn't exist", () => {
      it("should download and verify it", async () => {
        await expectBuidlerErrorAsync(
          () =>
            mockDownloader.getDownloadedCompilerPath(
              localCompilerBuild.version
            ),
          ERRORS.COMPILER_INVALID_DOWNLOAD
        );

        assert.isFalse(await fsExtra.pathExists(downloadedPath));
        assert.isTrue(downloadCalled);
      });
    });
  });
});
