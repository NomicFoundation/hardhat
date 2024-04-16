import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import fsPromises from "node:fs/promises";
import path from "node:path";
// import os from "node:os";
import { expectTypeOf } from "expect-type";

import {
  exists,
  chmod,
  copy,
  getAllFilesMatching,
  getChangeTime,
  getFileTrueCase,
  getRealPath,
  isDirectory,
  mkdir,
  move,
  readJsonFile,
  readUtf8File,
  readdir,
  remove,
  writeJsonFile,
  writeUtf8File,
} from "../src/fs.js";
import { useTmpDir } from "./helpers/fs.js";

// const IS_WINDOWS = os.platform() === "win32";

describe("File system utils", () => {
  const getTmpDir = useTmpDir("fs");

  describe("getRealPath", () => {
    it("Should resolve symlinks", async function () {
      /*       if (IS_WINDOWS) { // TODO is this still necessary?
        tc.skip();
      } */

      const actualPath = path.join(getTmpDir(), "mixedCasingFile");
      await writeUtf8File(actualPath, "");

      const linkPath = path.join(getTmpDir(), "link");
      await fsPromises.symlink(actualPath, linkPath);

      assert.equal(await getRealPath(linkPath), actualPath);
    });

    it("Should normalize the path", async function () {
      const actualPath = path.join(getTmpDir(), "file");
      await writeUtf8File(actualPath, "");

      const filePath = path.join(getTmpDir(), "a", "..", ".", "", "file");

      assert.equal(await getRealPath(filePath), actualPath);
    });

    it("Should throw FileNotFoundError if not found", async function () {
      const actualPath = path.join(getTmpDir(), "not-exists");

      await assert.rejects(getRealPath(actualPath), {
        name: "FileNotFoundError",
        message: `File ${actualPath} not found`,
      });
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async function () {
      const linkPath = path.join(getTmpDir(), "link");
      await fsPromises.symlink(linkPath, linkPath);

      await assert.rejects(getRealPath(linkPath), {
        name: "FileSystemAccessError",
      });
    });
  });

  describe("getAllFilesMatching", function () {
    beforeEach(async function () {
      await mkdir(path.join(getTmpDir(), "dir-empty"));
      await mkdir(path.join(getTmpDir(), "dir-with-files", "dir-within-dir"));
      await mkdir(path.join(getTmpDir(), "dir-with-extension.txt"));
      await mkdir(path.join(getTmpDir(), "dir-WithCasing"));

      // root files
      await writeUtf8File(path.join(getTmpDir(), "file-1.txt"), "");
      await writeUtf8File(path.join(getTmpDir(), "file-2.txt"), "");
      await writeUtf8File(path.join(getTmpDir(), "file-3.json"), "");

      // dir-with-files files
      await writeUtf8File(
        path.join(getTmpDir(), "dir-with-files", "inner-file-1.json"),
        "",
      );
      await writeUtf8File(
        path.join(getTmpDir(), "dir-with-files", "inner-file-2.txt"),
        "",
      );

      // dir-with-files/dir-within-dir files
      await writeUtf8File(
        path.join(getTmpDir(), "dir-with-files", "dir-within-dir", "file-deep"),
        "",
      );

      // dir-with-extension.txt files
      await writeUtf8File(
        path.join(getTmpDir(), "dir-with-extension.txt", "inner-file-3.txt"),
        "",
      );
      await writeUtf8File(
        path.join(getTmpDir(), "dir-with-extension.txt", "inner-file-4.json"),
        "",
      );

      // dir-WithCasing files
      await writeUtf8File(
        path.join(getTmpDir(), "dir-WithCasing", "file-WithCASING"),
        "",
      );
    });

    async function assertGetAllFilesMatching(
      dir: string,
      matches: ((f: string) => boolean) | undefined,
      expected: string[],
    ) {
      assert.deepEqual(
        new Set(await getAllFilesMatching(dir, matches)),
        new Set(expected),
      );
    }

    it("Should return an empty array if the dir doesn't exist", async function () {
      await assertGetAllFilesMatching(
        path.join(getTmpDir(), "not-in-fs"),
        undefined,
        [],
      );
    });

    it("Should return an empty array if the dir is empty", async function () {
      await assertGetAllFilesMatching(
        path.join(getTmpDir(), "dir-empty"),
        undefined,
        [],
      );
    });

    it("Should return an empty array if no file matches", async function () {
      await assertGetAllFilesMatching(getTmpDir(), () => false, []);
    });

    it("Should return every file by default, recursively", async function () {
      await assertGetAllFilesMatching(getTmpDir(), undefined, [
        path.join(getTmpDir(), "file-1.txt"),
        path.join(getTmpDir(), "file-2.txt"),
        path.join(getTmpDir(), "file-3.json"),
        path.join(getTmpDir(), "dir-with-files", "inner-file-1.json"),
        path.join(getTmpDir(), "dir-with-files", "inner-file-2.txt"),
        path.join(getTmpDir(), "dir-with-extension.txt", "inner-file-3.txt"),
        path.join(getTmpDir(), "dir-with-extension.txt", "inner-file-4.json"),
        path.join(getTmpDir(), "dir-WithCasing", "file-WithCASING"),
        path.join(getTmpDir(), "dir-with-files", "dir-within-dir", "file-deep"),
      ]);

      await assertGetAllFilesMatching(
        path.join(getTmpDir(), "dir-WithCasing"),
        undefined,
        [path.join(getTmpDir(), "dir-WithCasing", "file-WithCASING")],
      );
    });

    it("Should filter files and not dirs", async function () {
      await assertGetAllFilesMatching(getTmpDir(), (f) => f.endsWith(".txt"), [
        path.join(getTmpDir(), "file-1.txt"),
        path.join(getTmpDir(), "file-2.txt"),
        path.join(getTmpDir(), "dir-with-files", "inner-file-2.txt"),
        path.join(getTmpDir(), "dir-with-extension.txt", "inner-file-3.txt"),
      ]);

      await assertGetAllFilesMatching(getTmpDir(), (f) => !f.endsWith(".txt"), [
        path.join(getTmpDir(), "file-3.json"),
        path.join(getTmpDir(), "dir-with-files", "inner-file-1.json"),
        path.join(getTmpDir(), "dir-with-extension.txt", "inner-file-4.json"),
        path.join(getTmpDir(), "dir-WithCasing", "file-WithCASING"),
        path.join(getTmpDir(), "dir-with-files", "dir-within-dir", "file-deep"),
      ]);
    });

    it("Should preserve the true casing of the files, except for the dir's path", async function () {
      await assertGetAllFilesMatching(
        getTmpDir(),
        (f) => f.toLowerCase().endsWith("withcasing"),
        [path.join(getTmpDir(), "dir-WithCasing", "file-WithCASING")],
      );
    });

    it("Should throw InvalidDirectoryError if the path is not a directory", async function () {
      const dirPath = path.join(getTmpDir(), "file-1.txt");

      await assert.rejects(
        getAllFilesMatching(path.join(getTmpDir(), "file-1.txt")),
        {
          name: "InvalidDirectoryError",
          message: `Invalid directory ${dirPath}`,
        },
      );
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async function () {
      const dirPath = path.join(getTmpDir(), "protected-dir");
      await mkdir(dirPath);

      try {
        await chmod(dirPath, 0o000);

        await assert.rejects(getAllFilesMatching(dirPath), {
          name: "FileSystemAccessError",
        });
      } finally {
        await chmod(dirPath, 0o777);
      }
    });
  });

  describe("getFileTrueCase", function () {
    it("Should return the true case of files and dirs", async function () {
      const mixedCaseFilePath = path.join(getTmpDir(), "mixedCaseFile");
      const mixedCaseDirPath = path.join(getTmpDir(), "mixedCaseDir");
      const mixedCaseFile2Path = path.join(mixedCaseDirPath, "mixedCaseFile2");

      await writeUtf8File(mixedCaseFilePath, "");
      await mkdir(mixedCaseDirPath);
      await writeUtf8File(mixedCaseFile2Path, "");

      // We test mixedCaseFilePath from tmpdir
      assert.equal(
        await getFileTrueCase(getTmpDir(), "mixedCaseFile"),
        path.relative(getTmpDir(), mixedCaseFilePath),
      );
      assert.equal(
        await getFileTrueCase(getTmpDir(), "mixedcasefile"),
        path.relative(getTmpDir(), mixedCaseFilePath),
      );
      assert.equal(
        await getFileTrueCase(getTmpDir(), "MIXEDCASEFILE"),
        path.relative(getTmpDir(), mixedCaseFilePath),
      );

      // We test mixedCaseDirPath from tmpdir
      assert.equal(
        await getFileTrueCase(getTmpDir(), "mixedCaseDir"),
        path.relative(getTmpDir(), mixedCaseDirPath),
      );
      assert.equal(
        await getFileTrueCase(getTmpDir(), "mixedcasedir"),
        path.relative(getTmpDir(), mixedCaseDirPath),
      );
      assert.equal(
        await getFileTrueCase(getTmpDir(), "MIXEDCASEDIR"),
        path.relative(getTmpDir(), mixedCaseDirPath),
      );

      // We test mixedCaseFilePath2 from tmpdir
      assert.equal(
        await getFileTrueCase(
          getTmpDir(),
          path.join("mixedCaseDir", "mixedCaseFile2"),
        ),
        path.relative(getTmpDir(), mixedCaseFile2Path),
      );
      assert.equal(
        await getFileTrueCase(
          getTmpDir(),
          path.join("mixedcasedir", "MIXEDCASEFILE2"),
        ),
        path.relative(getTmpDir(), mixedCaseFile2Path),
      );
      assert.equal(
        await getFileTrueCase(
          getTmpDir(),
          path.join("MIXEDCASEDIR", "mixedcasefile2"),
        ),
        path.relative(getTmpDir(), mixedCaseFile2Path),
      );

      // We test mixedCaseFilePath2 from mixedCaseDir
      assert.equal(
        await getFileTrueCase(mixedCaseDirPath, "mixedCaseFile2"),
        path.relative(mixedCaseDirPath, mixedCaseFile2Path),
      );
      assert.equal(
        await getFileTrueCase(mixedCaseDirPath, "MIXEDCASEFILE2"),
        path.relative(mixedCaseDirPath, mixedCaseFile2Path),
      );
      assert.equal(
        await getFileTrueCase(mixedCaseDirPath, "mixedcasefile2"),
        path.relative(mixedCaseDirPath, mixedCaseFile2Path),
      );
    });

    it("Should NOT resolve symlinks", async function () {
      /*       if (IS_WINDOWS) {
        this.skip();
      } */

      const actualPath = path.join(getTmpDir(), "mixedCasingFile");
      await writeUtf8File(actualPath, "");

      const linkPath = path.join(getTmpDir(), "lInK");
      await fsPromises.symlink(actualPath, linkPath);

      assert.equal(await getFileTrueCase(getTmpDir(), "link"), "lInK");
    });

    it("Should throw FileNotFoundError if not found", async function () {
      const actualPath = path.join(getTmpDir(), "not-exists");

      await assert.rejects(getFileTrueCase(getTmpDir(), "not-exists"), {
        name: "FileNotFoundError",
        message: `File ${actualPath} not found`,
      });
    });

    it("Should throw InvalidDirectoryError if the starting directory is not a directory", async function () {
      const filePath = path.join(getTmpDir(), "file");
      await writeUtf8File(filePath, "");

      await assert.rejects(getFileTrueCase(filePath, "asd"), {
        name: "InvalidDirectoryError",
        message: `Invalid directory ${filePath}`,
      });
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async function () {
      const dirPath = path.join(getTmpDir(), "protected-dir");
      await mkdir(dirPath);

      try {
        await chmod(dirPath, 0o000);

        await assert.rejects(getFileTrueCase(dirPath, "file"), {
          name: "FileSystemAccessError",
        });
      } finally {
        await chmod(dirPath, 0o777);
      }
    });
  });

  describe("isDirectory", function () {
    it("Should return true if the path is a directory", async function () {
      const dirPath = path.join(getTmpDir(), "dir");
      await mkdir(dirPath);

      assert.ok(await isDirectory(dirPath));
    });

    it("Should return false if the path is not a directory", async function () {
      const filePath = path.join(getTmpDir(), "file");
      await writeUtf8File(filePath, "");

      assert.ok(!(await isDirectory(filePath)));
    });

    it("Should throw FileNotFoundError if the path doesn't exist", async function () {
      const actualPath = path.join(getTmpDir(), "not-exists");

      await assert.rejects(isDirectory(actualPath), {
        name: "FileNotFoundError",
        message: `File ${actualPath} not found`,
      });
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async function () {
      // As a directory with no permissions can still be accessed by stat, we need
      // to pass a path that is not a valid directory path, for example a null byte.
      const invalidPath = "\0";

      await assert.rejects(isDirectory(invalidPath), {
        name: "FileSystemAccessError",
      });
    });
  });

  describe("readJsonFile", function () {
    it("Should read and parse a JSON file", async function () {
      const expectedObject = { a: 1, b: 2 };
      const filePath = path.join(getTmpDir(), "file.json");
      await writeUtf8File(filePath, JSON.stringify(expectedObject));

      assert.deepEqual(await readJsonFile(filePath), expectedObject);
      expectTypeOf(await readJsonFile(filePath)).toBeUnknown();
      expectTypeOf(
        await readJsonFile<{ a: number; b: number }>(filePath),
      ).toMatchTypeOf<{ a: number; b: number }>();
    });

    it("Should throw InvalidFileFormatError if the file is not valid JSON", async function () {
      const filePath = path.join(getTmpDir(), "file.json");
      await writeUtf8File(filePath, "not-json");

      await assert.rejects(readJsonFile(filePath), {
        name: "InvalidFileFormatError",
        message: `Invalid file format: ${filePath}`,
      });
    });

    it("Should throw FileNotFoundError if the file doesn't exist", async function () {
      const filePath = path.join(getTmpDir(), "not-exists.json");

      await assert.rejects(readJsonFile(filePath), {
        name: "FileNotFoundError",
        message: `File ${filePath} not found`,
      });
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async function () {
      const filePath = path.join(getTmpDir(), "protected-file.json");
      await writeUtf8File(filePath, "");

      try {
        await chmod(filePath, 0o000);

        await assert.rejects(readJsonFile(filePath), {
          name: "FileSystemAccessError",
        });
      } finally {
        await chmod(filePath, 0o777);
      }
    });
  });

  describe("writeJsonFile", function () {
    it("Should write an object to a JSON file", async function () {
      const expectedObject = { a: 1, b: 2 };
      const filePath = path.join(getTmpDir(), "file.json");

      await writeJsonFile(filePath, expectedObject);

      assert.deepEqual(
        JSON.parse(await readUtf8File(filePath)),
        expectedObject,
      );
      expectTypeOf(
        writeJsonFile<{ a: number; b: number }>(filePath, expectedObject),
      );
    });

    it("Should throw JsonSerializationError if the object can't be serialized to JSON", async function () {
      const filePath = path.join(getTmpDir(), "file.json");
      // create an object with a circular reference
      const circularObject: { self?: {} } = {};
      circularObject.self = circularObject;

      await assert.rejects(writeJsonFile(filePath, circularObject), {
        name: "JsonSerializationError",
        message: `Error serializing JSON file ${filePath}`,
      });
    });

    it("Should throw FileNotFoundError if part of the path doesn't exist", async function () {
      const filePath = path.join(getTmpDir(), "not-exists", "file.json");

      await assert.rejects(writeJsonFile(filePath, {}), {
        name: "FileNotFoundError",
        message: `File ${filePath} not found`,
      });
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async function () {
      const filePath = path.join(getTmpDir(), "protected-file.json");
      await writeUtf8File(filePath, "");

      try {
        await chmod(filePath, 0o000);

        await assert.rejects(writeJsonFile(filePath, {}), {
          name: "FileSystemAccessError",
        });
      } finally {
        await chmod(filePath, 0o777);
      }
    });
  });

  describe("readUtf8File", function () {
    it("Should read a file and return its content as a string", async function () {
      const content = "hello";
      const filePath = path.join(getTmpDir(), "file.txt");
      await writeUtf8File(filePath, content);

      assert.equal(await readUtf8File(filePath), content);
      expectTypeOf(await readUtf8File(filePath)).toMatchTypeOf<string>();
    });

    it("Should throw FileNotFoundError if the file doesn't exist", async function () {
      const filePath = path.join(getTmpDir(), "not-exists.txt");

      await assert.rejects(readUtf8File(filePath), {
        name: "FileNotFoundError",
        message: `File ${filePath} not found`,
      });
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async function () {
      const filePath = path.join(getTmpDir(), "protected-file.txt");
      await writeUtf8File(filePath, "");

      try {
        await chmod(filePath, 0o000);

        await assert.rejects(readUtf8File(filePath), {
          name: "FileSystemAccessError",
        });
      } finally {
        await chmod(filePath, 0o777);
      }
    });
  });

  describe("writeUtf8File", function () {
    it("Should write a string to a file", async function () {
      const content = "hello";
      const filePath = path.join(getTmpDir(), "file.txt");

      await writeUtf8File(filePath, content);

      assert.equal(await readUtf8File(filePath), content);
    });

    it("Should allow setting the flag", async function () {
      const content = "hello";
      const filePath = path.join(getTmpDir(), "file.txt");

      await writeUtf8File(filePath, content);
      await writeUtf8File(filePath, content, "a");

      assert.equal(await readUtf8File(filePath), `${content}${content}`);
    });

    it("Should throw FileNotFoundError if part of the path doesn't exist", async function () {
      const filePath = path.join(getTmpDir(), "not-exists", "file.txt");

      await assert.rejects(writeUtf8File(filePath, ""), {
        name: "FileNotFoundError",
        message: `File ${filePath} not found`,
      });
    });

    it("Should throw FileAlreadyExistsError if the file already exists and the flag 'x' is used", async function () {
      const filePath = path.join(getTmpDir(), "file.txt");
      await writeUtf8File(filePath, "");

      await assert.rejects(writeUtf8File(filePath, "", "wx"), {
        name: "FileAlreadyExistsError",
        message: `File ${filePath} already exists`,
      });
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async function () {
      const filePath = path.join(getTmpDir(), "protected-file.txt");

      try {
        await writeUtf8File(filePath, "");

        await chmod(filePath, 0o000);

        await assert.rejects(writeUtf8File(filePath, ""), {
          name: "FileSystemAccessError",
        });
      } finally {
        await chmod(filePath, 0o777);
      }
    });
  });

  describe("readdir", function () {
    it("Should return the files in a directory", async function () {
      const dirPath = path.join(getTmpDir(), "dir");
      await mkdir(dirPath);

      const files = ["file1.txt", "file2.txt", "file3.json"];
      for (const file of files) {
        await writeUtf8File(path.join(dirPath, file), "");
      }

      const subDirPath = path.join(dirPath, "subdir");
      await mkdir(subDirPath);
      await writeUtf8File(path.join(subDirPath, "file4.txt"), "");

      // should include the subdir but not its content as it's not recursive
      assert.deepEqual(
        new Set(await readdir(dirPath)),
        new Set(["file1.txt", "file2.txt", "file3.json", "subdir"]),
      );
    });

    it("Should throw FileNotFoundError if the directory doesn't exist", async function () {
      const dirPath = path.join(getTmpDir(), "not-exists");

      await assert.rejects(readdir(dirPath), {
        name: "FileNotFoundError",
        message: `File ${dirPath} not found`,
      });
    });

    it("Should throw InvalidDirectoryError if the path is not a directory", async function () {
      const filePath = path.join(getTmpDir(), "file");
      await writeUtf8File(filePath, "");

      await assert.rejects(readdir(filePath), {
        name: "InvalidDirectoryError",
        message: `Invalid directory ${filePath}`,
      });
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async function () {
      const dirPath = path.join(getTmpDir(), "protected-dir");
      await mkdir(dirPath);

      try {
        await chmod(dirPath, 0o000);

        await assert.rejects(readdir(dirPath), {
          name: "FileSystemAccessError",
        });
      } finally {
        await chmod(dirPath, 0o777);
      }
    });
  });

  describe("mkdir", function () {
    it("Should create a directory", async function () {
      const dirPath = path.join(getTmpDir(), "dir");

      await mkdir(dirPath);

      assert.ok(await isDirectory(dirPath));
    });

    it("Should create a directory and any necessary directories along the way", async function () {
      const dirPath = path.join(getTmpDir(), "dir", "subdir");

      await mkdir(dirPath);

      assert.ok(await isDirectory(dirPath));
    });

    it("Should do nothing if the directory already exists", async function () {
      const dirPath = path.join(getTmpDir(), "dir");

      await mkdir(dirPath);
      await mkdir(dirPath);

      assert.ok(await isDirectory(dirPath));
    });

    it("Should throw FileSystemAccessError for any error", async function () {
      const dirPath = path.join(getTmpDir(), "protected-dir");

      await mkdir(dirPath);

      try {
        await chmod(dirPath, 0o000);

        await assert.rejects(mkdir(path.join(dirPath, "subdir")), {
          name: "FileSystemAccessError",
        });
      } finally {
        await chmod(dirPath, 0o777);
      }
    });
  });

  describe("getChangeTime", function () {
    it("Should return the change time of a file", async function () {
      const filePath = path.join(getTmpDir(), "file.txt");
      await writeUtf8File(filePath, "");

      const stats = await fsPromises.stat(filePath);

      assert.equal(
        stats.ctime.getTime(),
        (await getChangeTime(filePath)).getTime(),
      );
    });

    it("Should throw FileNotFoundError if the file doesn't exist", async function () {
      const filePath = path.join(getTmpDir(), "not-exists.txt");

      await assert.rejects(getChangeTime(filePath), {
        name: "FileNotFoundError",
        message: `File ${filePath} not found`,
      });
    });
  });

  describe("exists", function () {
    it("Should return true if the file exists", async function () {
      const filePath = path.join(getTmpDir(), "file.txt");
      await writeUtf8File(filePath, "");

      assert.ok(await exists(filePath));
    });

    it("Should return false if the file doesn't exist", async function () {
      const filePath = path.join(getTmpDir(), "not-exists.txt");

      assert.ok(!(await exists(filePath)));
    });
  });

  describe("copy", function () {
    it("Should copy a file", async function () {
      const srcPath = path.join(getTmpDir(), "src.txt");
      const destPath = path.join(getTmpDir(), "dest.txt");

      await writeUtf8File(srcPath, "hello");
      await copy(srcPath, destPath);

      assert.equal(await readUtf8File(destPath), "hello");
    });

    it("Should throw FileNotFoundError if the source file doesn't exist", async function () {
      const srcPath = path.join(getTmpDir(), "not-exists.txt");
      const destPath = path.join(getTmpDir(), "dest.txt");

      await assert.rejects(copy(srcPath, destPath), {
        name: "FileNotFoundError",
        message: `File ${srcPath} not found`,
      });
    });

    it("Should throw FileNotFoundError if the destination path doesn't exist", async function () {
      const srcPath = path.join(getTmpDir(), "src.txt");
      const destPath = path.join(getTmpDir(), "not-exists", "dest.txt");

      await writeUtf8File(srcPath, "");

      await assert.rejects(copy(srcPath, destPath), {
        name: "FileNotFoundError",
        message: `File ${destPath} not found`,
      });
    });

    it("Should throw IsDirectoryError if the source path is a directory", async function () {
      const srcPath = path.join(getTmpDir(), "dir");
      const destPath = path.join(getTmpDir(), "dest.txt");

      await mkdir(srcPath);

      await assert.rejects(copy(srcPath, destPath), {
        name: "IsDirectoryError",
        message: `Path ${srcPath} is a directory`,
      });
    });

    it("Should throw IsDirectoryError if the destination path is a directory", async function () {
      const srcPath = path.join(getTmpDir(), "src.txt");
      const destPath = path.join(getTmpDir(), "dir");

      await writeUtf8File(srcPath, "");
      await mkdir(destPath);

      await assert.rejects(copy(srcPath, destPath), {
        name: "IsDirectoryError",
        message: `Path ${destPath} is a directory`,
      });
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async function () {
      const srcPath = path.join(getTmpDir(), "src.txt");
      const destPath = path.join(getTmpDir(), "dest.txt");

      await writeUtf8File(srcPath, "");

      try {
        await chmod(srcPath, 0o000);

        await assert.rejects(copy(srcPath, destPath), {
          name: "FileSystemAccessError",
        });
      } finally {
        await chmod(srcPath, 0o777);
      }
    });
  });

  describe("remove", function () {
    it("Should remove a file", async function () {
      const filePath = path.join(getTmpDir(), "file.txt");
      await writeUtf8File(filePath, "");

      await remove(filePath);

      assert.ok(!(await exists(filePath)));
    });

    it("Should remove an empty directory", async function () {
      const dirPath = path.join(getTmpDir(), "dir");
      await mkdir(dirPath);

      await remove(dirPath);

      assert.ok(!(await exists(dirPath)));
    });

    it("Should remove a directory and its content", async function () {
      const dirPath = path.join(getTmpDir(), "dir");
      await mkdir(dirPath);

      const files = ["file1.txt", "file2.txt", "file3.json"];
      for (const file of files) {
        await writeUtf8File(path.join(dirPath, file), "");
      }

      const subDirPath = path.join(dirPath, "subdir");
      await mkdir(subDirPath);
      await writeUtf8File(path.join(subDirPath, "file4.txt"), "");

      await remove(dirPath);

      assert.ok(!(await exists(dirPath)));
    });

    it("Should not throw if the path doesn't exist", async function () {
      const filePath = path.join(getTmpDir(), "not-exists.txt");

      await assert.doesNotReject(remove(filePath));
    });

    it("Should throw FileSystemAccessError for any error", async function () {
      const filePath = path.join(getTmpDir(), "protected-file.txt");
      await writeUtf8File(filePath, "");

      try {
        // the delete permission depends on the parent directory
        await chmod(getTmpDir(), 0o000);

        await assert.rejects(remove(filePath), {
          name: "FileSystemAccessError",
        });
      } finally {
        await chmod(getTmpDir(), 0o777);
      }
    });
  });

  describe("chmod", function () {
    it("Should change the mode of a file", async function () {
      const filePath = path.join(getTmpDir(), "file.txt");
      await writeUtf8File(filePath, "");

      await chmod(filePath, 0o777);

      const stats = await fsPromises.stat(filePath);

      // eslint-disable-next-line no-bitwise
      assert.equal(stats.mode & 0o777, 0o777);
    });

    it("Should throw FileNotFoundError if the file doesn't exist", async function () {
      const filePath = path.join(getTmpDir(), "not-exists.txt");

      await assert.rejects(chmod(filePath, 0o777), {
        name: "FileNotFoundError",
        message: `File ${filePath} not found`,
      });
    });
  });

  describe("move", function () {
    it("Should move a file", async function () {
      const srcPath = path.join(getTmpDir(), "src.txt");
      const destPath = path.join(getTmpDir(), "dest.txt");

      await writeUtf8File(srcPath, "hello");
      await move(srcPath, destPath);

      assert.equal(await readUtf8File(destPath), "hello");
      assert.ok(!(await exists(srcPath)));
    });

    it("Should move a directory", async function () {
      const srcPath = path.join(getTmpDir(), "dir");
      const destPath = path.join(getTmpDir(), "dest");

      await mkdir(srcPath);
      await writeUtf8File(path.join(srcPath, "file.txt"), "");

      await move(srcPath, destPath);

      assert.ok(!(await exists(srcPath)));
      assert.ok(await exists(destPath));
      assert.ok(await exists(path.join(destPath, "file.txt")));
    });

    it("Should throw FileNotFoundError if the source file doesn't exist", async function () {
      const srcPath = path.join(getTmpDir(), "not-exists.txt");
      const destPath = path.join(getTmpDir(), "dest.txt");

      await assert.rejects(move(srcPath, destPath), {
        name: "FileNotFoundError",
        message: `File ${srcPath} not found`,
      });
    });

    it("Should throw FileNotFoundError if the destination path doesn't exist", async function () {
      const srcPath = path.join(getTmpDir(), "src.txt");
      const destPath = path.join(getTmpDir(), "not-exists", "dest.txt");

      await writeUtf8File(srcPath, "");

      await assert.rejects(move(srcPath, destPath), {
        name: "FileNotFoundError",
        message: `File ${destPath} not found`,
      });
    });

    it("Should throw DirectoryNotEmptyError if the source path is a directory and the destination path is a directory that is not empty", async function () {
      const srcPath = path.join(getTmpDir(), "dir");
      const destPath = path.join(getTmpDir(), "dest");

      await mkdir(srcPath);
      await mkdir(destPath);
      await writeUtf8File(path.join(destPath, "file.txt"), "");

      await assert.rejects(move(srcPath, destPath), {
        name: "DirectoryNotEmptyError",
        message: `Directory ${destPath} is not empty`,
      });
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async function () {
      const srcPath = path.join(getTmpDir(), "src.txt");
      const destPath = path.join(getTmpDir(), "dest.txt");

      await writeUtf8File(srcPath, "");

      try {
        await chmod(getTmpDir(), 0o000);

        await assert.rejects(move(srcPath, destPath), {
          name: "FileSystemAccessError",
        });
      } finally {
        await chmod(getTmpDir(), 0o777);
      }
    });
  });
});
