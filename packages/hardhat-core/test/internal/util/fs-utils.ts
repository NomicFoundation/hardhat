import fsPromises from "fs/promises";
import path from "path";
import { assert } from "chai";
import { useTmpDir } from "../../helpers/fs";
import {
  FileNotFoundError,
  FileSystemAccessError,
  getAllFilesMatching,
  getAllFilesMatchingSync,
  getFileTrueCase,
  getFileTrueCaseSync,
  getRealPath,
  getRealPathSync,
} from "../../../src/internal/util/fs-utils";

const IS_WINDOWS = process.platform === "win32";

describe("fs-utils", function () {
  describe("getRealPath and getRealPathSync", function () {
    useTmpDir("ts-utils");

    async function assertWithBoth(input: string, expected: string) {
      assert.strictEqual(await getRealPath(input), expected);
      assert.strictEqual(getRealPathSync(input), expected);
    }

    it("should resolve symlinks", async function () {
      if (IS_WINDOWS) {
        this.skip();
      }

      const actualPath = path.join(this.tmpDir, "mixedCasingFile");
      const linkPath = path.join(this.tmpDir, "link");
      await fsPromises.writeFile(actualPath, "");

      await fsPromises.symlink(actualPath, linkPath);

      await assertWithBoth(linkPath, actualPath);
    });

    it("should normalize the path", async function () {
      const actualPath = path.join(this.tmpDir, "mixedCasingFile");

      await fsPromises.writeFile(actualPath, "");

      await assertWithBoth(
        path.join(this.tmpDir, "a", "..", ".", ".", "", "", "mixedCasingFile"),
        actualPath
      );
    });

    it("should throw FileNotFoundError if not found", async function () {
      try {
        await getRealPath(path.join(this.tmpDir, "not-exists"));
        assert.fail("Should have thrown");
      } catch (e) {
        if (!(e instanceof FileNotFoundError)) {
          throw e;
        }
      }

      try {
        getRealPathSync(path.join(this.tmpDir, "not-exists"));
        assert.fail("Should have thrown");
      } catch (e) {
        if (!(e instanceof FileNotFoundError)) {
          throw e;
        }
      }
    });

    it("should throw FileSystemAccessError if a different error is thrown", async function () {
      const linkPath = path.join(this.tmpDir, "link");

      await fsPromises.symlink(linkPath, linkPath);

      try {
        await getRealPath(linkPath);
        assert.fail("Should have thrown");
      } catch (e) {
        if (!(e instanceof FileSystemAccessError)) {
          throw e;
        }
      }

      try {
        getRealPathSync(linkPath);
        assert.fail("Should have thrown");
      } catch (e) {
        if (!(e instanceof FileSystemAccessError)) {
          throw e;
        }
      }
    });
  });

  describe("getFileTrueCase and getFileTrueCaseSync", function () {
    useTmpDir("getFileTrueCase");

    async function assertWithBoth(
      from: string,
      relativePath: string,
      expected: string
    ) {
      assert.strictEqual(await getFileTrueCase(from, relativePath), expected);
      assert.strictEqual(getFileTrueCaseSync(from, relativePath), expected);
    }

    it("Should throw FileNotFoundError if not found", async function () {
      try {
        await getFileTrueCase(__dirname, "asd");
        assert.fail("should have thrown");
      } catch (e) {
        if (!(e instanceof FileNotFoundError)) {
          throw e;
        }
      }

      try {
        getFileTrueCaseSync(__dirname, "asd");
        assert.fail("should have thrown");
      } catch (e) {
        if (!(e instanceof FileNotFoundError)) {
          throw e;
        }
      }
    });

    it("Should return the true case of files and dirs", async function () {
      const mixedCaseFilePath = path.join(this.tmpDir, "mixedCaseFile");
      const mixedCaseDirPath = path.join(this.tmpDir, "mixedCaseDir");
      const mixedCaseFile2Path = path.join(mixedCaseDirPath, "mixedCaseFile2");

      await fsPromises.writeFile(mixedCaseFilePath, "");
      await fsPromises.mkdir(mixedCaseDirPath);
      await fsPromises.writeFile(mixedCaseFile2Path, "");

      // We test mixedCaseFilePath form tmpdir
      await assertWithBoth(
        this.tmpDir,
        "mixedCaseFile",
        path.relative(this.tmpDir, mixedCaseFilePath)
      );
      await assertWithBoth(
        this.tmpDir,
        "mixedcasefile",
        path.relative(this.tmpDir, mixedCaseFilePath)
      );
      await assertWithBoth(
        this.tmpDir,
        "MIXEDCASEFILE",
        path.relative(this.tmpDir, mixedCaseFilePath)
      );

      // We test mixedCaseDirPath form tmpdir
      await assertWithBoth(
        this.tmpDir,
        "mixedCaseDir",
        path.relative(this.tmpDir, mixedCaseDirPath)
      );
      await assertWithBoth(
        this.tmpDir,
        "mixedcasedir",
        path.relative(this.tmpDir, mixedCaseDirPath)
      );
      await assertWithBoth(
        this.tmpDir,
        "MIXEDCASEDIR",
        path.relative(this.tmpDir, mixedCaseDirPath)
      );

      // We test mixedCaseFilePath2 form tmpdir
      await assertWithBoth(
        this.tmpDir,
        path.join("mixedCaseDir", "mixedCaseFile2"),
        path.relative(this.tmpDir, mixedCaseFile2Path)
      );
      await assertWithBoth(
        this.tmpDir,
        path.join("mixedcasedir", "MIXEDCASEFILE2"),
        path.relative(this.tmpDir, mixedCaseFile2Path)
      );
      await assertWithBoth(
        this.tmpDir,
        path.join("MIXEDCASEDIR", "mixedcasefile2"),
        path.relative(this.tmpDir, mixedCaseFile2Path)
      );

      // We test mixedCaseFilePath2 form mixedCaseDir
      await assertWithBoth(
        mixedCaseDirPath,
        "mixedCaseFile2",
        path.relative(mixedCaseDirPath, mixedCaseFile2Path)
      );
      await assertWithBoth(
        mixedCaseDirPath,
        "MIXEDCASEFILE2",
        path.relative(mixedCaseDirPath, mixedCaseFile2Path)
      );
      await assertWithBoth(
        mixedCaseDirPath,
        "mixedcasefile2",
        path.relative(mixedCaseDirPath, mixedCaseFile2Path)
      );
    });

    it("Should NOT resolve symlinks", async function () {
      if (IS_WINDOWS) {
        this.skip();
      }

      const actualPath = path.join(this.tmpDir, "mixedCasingFile");
      const linkPath = path.join(this.tmpDir, "lInK");
      await fsPromises.writeFile(actualPath, "");

      await fsPromises.symlink(actualPath, linkPath);

      await assertWithBoth(this.tmpDir, "link", "lInK");
    });
  });

  describe("getAllFilesMatching and getAllFilesMatchingSync", function () {
    useTmpDir("getAllFilesMatching");

    beforeEach(async function () {
      await fsPromises.mkdir(path.join(this.tmpDir, "dir-empty"));
      await fsPromises.mkdir(path.join(this.tmpDir, "dir-with-files"));
      await fsPromises.mkdir(path.join(this.tmpDir, "dir-with-extension.txt"));
      await fsPromises.mkdir(path.join(this.tmpDir, "dir-WithCasing"));
      await fsPromises.mkdir(
        path.join(this.tmpDir, "dir-with-files", "dir-within-dir")
      );

      await fsPromises.writeFile(path.join(this.tmpDir, "file-1.txt"), "");
      await fsPromises.writeFile(path.join(this.tmpDir, "file-2.txt"), "");
      await fsPromises.writeFile(path.join(this.tmpDir, "file-3.json"), "");

      await fsPromises.writeFile(
        path.join(this.tmpDir, "dir-with-files", "inner-file-1.json"),
        ""
      );
      await fsPromises.writeFile(
        path.join(this.tmpDir, "dir-with-files", "inner-file-2.txt"),
        ""
      );

      // This dir has .txt extension and has a .txt and .json file
      await fsPromises.writeFile(
        path.join(this.tmpDir, "dir-with-extension.txt", "inner-file-3.txt"),
        ""
      );
      await fsPromises.writeFile(
        path.join(this.tmpDir, "dir-with-extension.txt", "inner-file-4.json"),
        ""
      );

      await fsPromises.writeFile(
        path.join(this.tmpDir, "dir-WithCasing", "file-WithCASING"),
        ""
      );

      await fsPromises.writeFile(
        path.join(this.tmpDir, "dir-with-files", "dir-within-dir", "file-deep"),
        ""
      );
    });

    async function assertBoth(
      dir: string,
      matches: ((f: string) => boolean) | undefined,
      expected: string[]
    ) {
      assert.deepEqual(
        new Set(await getAllFilesMatching(dir, matches)),
        new Set(expected)
      );

      assert.deepEqual(
        new Set(getAllFilesMatchingSync(dir, matches)),
        new Set(expected)
      );
    }

    it("Should return an empty array if the dir doesn't exist", async function () {
      await assertBoth(path.join(this.tmpDir, "not-in-fs"), undefined, []);
    });

    it("Should return an empty array if the dir is empty", async function () {
      await assertBoth(path.join(this.tmpDir, "dir-empty"), undefined, []);
    });

    it("Should return every file by default, recursively", async function () {
      await assertBoth(this.tmpDir, undefined, [
        path.join(this.tmpDir, "file-1.txt"),
        path.join(this.tmpDir, "file-2.txt"),
        path.join(this.tmpDir, "file-3.json"),
        path.join(this.tmpDir, "dir-with-files", "inner-file-1.json"),
        path.join(this.tmpDir, "dir-with-files", "inner-file-2.txt"),
        path.join(this.tmpDir, "dir-with-extension.txt", "inner-file-3.txt"),
        path.join(this.tmpDir, "dir-with-extension.txt", "inner-file-4.json"),
        path.join(this.tmpDir, "dir-WithCasing", "file-WithCASING"),
        path.join(this.tmpDir, "dir-with-files", "dir-within-dir", "file-deep"),
      ]);

      await assertBoth(path.join(this.tmpDir, "dir-WithCasing"), undefined, [
        path.join(this.tmpDir, "dir-WithCasing", "file-WithCASING"),
      ]);
    });

    it("Should filter files and not dirs", async function () {
      await assertBoth(this.tmpDir, (f) => f.endsWith(".txt"), [
        path.join(this.tmpDir, "file-1.txt"),
        path.join(this.tmpDir, "file-2.txt"),
        path.join(this.tmpDir, "dir-with-files", "inner-file-2.txt"),
        path.join(this.tmpDir, "dir-with-extension.txt", "inner-file-3.txt"),
      ]);

      await assertBoth(this.tmpDir, (f) => !f.endsWith(".txt"), [
        path.join(this.tmpDir, "file-3.json"),
        path.join(this.tmpDir, "dir-with-files", "inner-file-1.json"),
        path.join(this.tmpDir, "dir-with-extension.txt", "inner-file-4.json"),
        path.join(this.tmpDir, "dir-WithCasing", "file-WithCASING"),
        path.join(this.tmpDir, "dir-with-files", "dir-within-dir", "file-deep"),
      ]);
    });

    it("Should preserve the true casing of the files, except for the dir's path", async function () {
      it("Should filter files and not dirs", async function () {
        await assertBoth(
          this.tmpDir,
          (f) => f.toLowerCase().endsWith("withcasing"),
          [path.join(this.tmpDir, "dir-WithCasing", "file-WithCASING")]
        );
      });
    });
  });
});
