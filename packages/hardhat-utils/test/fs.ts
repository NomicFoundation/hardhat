import assert from "node:assert/strict";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, it } from "node:test";

import { expectTypeOf } from "expect-type";

import {
  exists,
  chmod,
  copy,
  createFile,
  emptyDir,
  findUp,
  getAllFilesMatching,
  getAllDirectoriesMatching,
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
  readBinaryFile,
  getAccessTime,
  getFileSize,
  readJsonFileAsStream,
  writeJsonFileAsStream,
  mkdtemp,
} from "../src/fs.js";

import { useTmpDir } from "./helpers/fs.js";

describe("File system utils", () => {
  const getTmpDir = useTmpDir("fs");

  describe("getRealPath", () => {
    it("Should resolve symlinks", async () => {
      const actualPath = path.join(getTmpDir(), "mixedCasingFile");
      await createFile(actualPath);

      const linkPath = path.join(getTmpDir(), "link");
      await fsPromises.symlink(actualPath, linkPath);

      assert.equal(await getRealPath(linkPath), actualPath);
    });

    it("Should normalize the path", async () => {
      const actualPath = path.join(getTmpDir(), "file");
      await createFile(actualPath);

      const filePath = path.join(getTmpDir(), "a", "..", ".", "", "file");

      assert.equal(await getRealPath(filePath), actualPath);
    });

    it("Should throw FileNotFoundError if not found", async () => {
      const actualPath = path.join(getTmpDir(), "not-exists");

      await assert.rejects(getRealPath(actualPath), {
        name: "FileNotFoundError",
        message: `File ${actualPath} not found`,
      });
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async () => {
      const linkPath = path.join(getTmpDir(), "link");
      await fsPromises.symlink(linkPath, linkPath);

      await assert.rejects(getRealPath(linkPath), {
        name: "FileSystemAccessError",
      });
    });
  });

  describe("getAllFilesMatching", () => {
    beforeEach(async () => {
      await mkdir(path.join(getTmpDir(), "dir-empty"));
      await mkdir(path.join(getTmpDir(), "dir-with-files", "dir-within-dir"));
      await mkdir(path.join(getTmpDir(), "dir-with-extension.txt"));
      await mkdir(path.join(getTmpDir(), "dir-WithCasing"));

      // root files
      await createFile(path.join(getTmpDir(), "file-1.txt"));
      await createFile(path.join(getTmpDir(), "file-2.txt"));
      await createFile(path.join(getTmpDir(), "file-3.json"));

      // dir-with-files files
      await createFile(
        path.join(getTmpDir(), "dir-with-files", "inner-file-1.json"),
      );
      await createFile(
        path.join(getTmpDir(), "dir-with-files", "inner-file-2.txt"),
      );

      // dir-with-files/dir-within-dir files
      await createFile(
        path.join(getTmpDir(), "dir-with-files", "dir-within-dir", "file-deep"),
      );

      // dir-with-extension.txt files
      await createFile(
        path.join(getTmpDir(), "dir-with-extension.txt", "inner-file-3.txt"),
      );
      await createFile(
        path.join(getTmpDir(), "dir-with-extension.txt", "inner-file-4.json"),
      );

      // dir-WithCasing files
      await createFile(
        path.join(getTmpDir(), "dir-WithCasing", "file-WithCASING"),
      );
    });

    async function assertGetAllFilesMatching(
      dir: string,
      matches: ((f: string) => Promise<boolean> | boolean) | undefined,
      expected: string[],
    ) {
      assert.deepEqual(
        new Set(await getAllFilesMatching(dir, matches)),
        new Set(expected),
      );
    }

    it("Should return an empty array if the dir doesn't exist", async () => {
      await assertGetAllFilesMatching(
        path.join(getTmpDir(), "not-in-fs"),
        undefined,
        [],
      );
    });

    it("Should return an empty array if the dir is empty", async () => {
      await assertGetAllFilesMatching(
        path.join(getTmpDir(), "dir-empty"),
        undefined,
        [],
      );
    });

    it("Should return an empty array if no file matches", async () => {
      await assertGetAllFilesMatching(getTmpDir(), () => false, []);
    });

    it("Should return every file by default, recursively", async () => {
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

    it("Should filter files and not dirs", async () => {
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

    it("Should filter files asynchronously", async () => {
      await writeUtf8File(path.join(getTmpDir(), "file-1.txt"), "skip");

      await assertGetAllFilesMatching(
        getTmpDir(),
        async (f) => {
          return f.endsWith(".txt") && (await readUtf8File(f)) !== "skip";
        },
        [
          path.join(getTmpDir(), "file-2.txt"),
          path.join(getTmpDir(), "dir-with-files", "inner-file-2.txt"),
          path.join(getTmpDir(), "dir-with-extension.txt", "inner-file-3.txt"),
        ],
      );
    });

    it("Should preserve the true casing of the files, except for the dir's path", async () => {
      await assertGetAllFilesMatching(
        getTmpDir(),
        (f) => f.toLowerCase().endsWith("withcasing"),
        [path.join(getTmpDir(), "dir-WithCasing", "file-WithCASING")],
      );
    });

    it("Should throw NotADirectoryError if the path is not a directory", async () => {
      const dirPath = path.join(getTmpDir(), "file-1.txt");

      await assert.rejects(
        getAllFilesMatching(path.join(getTmpDir(), "file-1.txt")),
        {
          name: "NotADirectoryError",
          message: `Path ${dirPath} is not a directory`,
        },
      );
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async () => {
      const linkPath = path.join(getTmpDir(), "link");
      await fsPromises.symlink(linkPath, linkPath);

      await assert.rejects(getAllFilesMatching(linkPath), {
        name: "FileSystemAccessError",
      });
    });

    describe("With directoryFilter", () => {
      it("Should return an empty array if directoryFilter returns false", async () => {
        const from = path.join(getTmpDir(), "from");

        const skipPath = path.join(from, "skip");
        await mkdir(skipPath);

        const dirPath = path.join(from, "dir");
        await mkdir(dirPath);

        await writeUtf8File(path.join(from, "from.txt"), "from");
        await writeUtf8File(path.join(skipPath, "skip.txt"), "skip");
        await writeUtf8File(path.join(dirPath, "dir.txt"), "dir");

        const files = await getAllFilesMatching(
          from,
          undefined,
          (absolutePathToDir) => {
            return !absolutePathToDir.endsWith("skip");
          },
        );

        assert.deepEqual(
          new Set(files),
          new Set([path.join(from, "from.txt"), path.join(dirPath, "dir.txt")]),
        );
      });

      it("Should filter directories asynchronously", async () => {
        const from = path.join(getTmpDir(), "from");

        const dirPath = path.join(from, "dir");
        await mkdir(dirPath);

        const skipPath = path.join(from, "skip");
        await mkdir(skipPath);

        await writeUtf8File(path.join(from, "from.txt"), "from");
        await writeUtf8File(path.join(dirPath, "dir.txt"), "dir");
        await writeUtf8File(path.join(skipPath, "skip.txt"), "skip");
        await writeUtf8File(path.join(skipPath, ".skip"), "");

        const files = await getAllFilesMatching(
          from,
          undefined,
          async (absolutePathToDir) => {
            return !(await exists(path.join(absolutePathToDir, ".skip")));
          },
        );

        assert.deepEqual(
          new Set(files),
          new Set([path.join(from, "from.txt"), path.join(dirPath, "dir.txt")]),
        );
      });
    });
  });

  describe("getAllDirectoriesMatching", () => {
    beforeEach(async () => {
      await mkdir(path.join(getTmpDir(), "dir-empty"));
      await mkdir(path.join(getTmpDir(), "dir-with-files"));
      await mkdir(path.join(getTmpDir(), "dir-with-subdir", "dir-within-dir"));
      await mkdir(path.join(getTmpDir(), "dir-with-extension.txt"));
      await mkdir(path.join(getTmpDir(), "dir-WithCasing"));

      await createFile(path.join(getTmpDir(), "dir-with-files", "file-1.txt"));
    });

    async function assertGetAllDirectoriesMatching(
      dir: string,
      matches: ((d: string) => Promise<boolean> | boolean) | undefined,
      expected: string[],
    ) {
      assert.deepEqual(
        new Set(await getAllDirectoriesMatching(dir, matches)),
        new Set(expected),
      );
    }

    it("Should return an empty array if the dir doesn't exist", async () => {
      await assertGetAllDirectoriesMatching(
        path.join(getTmpDir(), "not-in-fs"),
        undefined,
        [],
      );
    });

    it("Should return an empty array if the dir is empty", async () => {
      await assertGetAllDirectoriesMatching(
        path.join(getTmpDir(), "dir-empty"),
        undefined,
        [],
      );
    });

    it("Should return an empty array if no file matches", async () => {
      await assertGetAllDirectoriesMatching(getTmpDir(), () => false, []);
    });

    it("Should return every dir by default, recursively, except for subdirs of matched dirs", async () => {
      await assertGetAllDirectoriesMatching(getTmpDir(), undefined, [
        path.join(getTmpDir(), "dir-empty"),
        path.join(getTmpDir(), "dir-with-files"),
        path.join(getTmpDir(), "dir-with-subdir"),
        path.join(getTmpDir(), "dir-with-extension.txt"),
        path.join(getTmpDir(), "dir-WithCasing"),
      ]);

      await assertGetAllDirectoriesMatching(
        path.join(getTmpDir(), "dir-with-subdir"),
        undefined,
        [path.join(getTmpDir(), "dir-with-subdir", "dir-within-dir")],
      );
    });

    it("Should filter dirs", async () => {
      await assertGetAllDirectoriesMatching(
        getTmpDir(),
        (d) => d.endsWith(".txt"),
        [path.join(getTmpDir(), "dir-with-extension.txt")],
      );
    });

    it("Should filter dirs asynchronously", async () => {
      await assertGetAllDirectoriesMatching(
        getTmpDir(),
        async (d) => (await getAllFilesMatching(d)).length !== 0,
        [path.join(getTmpDir(), "dir-with-files")],
      );
    });
  });

  describe("getFileTrueCase", () => {
    it("Should return the true case of files and dirs", async () => {
      const mixedCaseFilePath = path.join(getTmpDir(), "mixedCaseFile");
      const mixedCaseDirPath = path.join(getTmpDir(), "mixedCaseDir");
      const mixedCaseFile2Path = path.join(mixedCaseDirPath, "mixedCaseFile2");

      await createFile(mixedCaseFilePath);
      await mkdir(mixedCaseDirPath);
      await createFile(mixedCaseFile2Path);

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

    it("Should NOT resolve symlinks", async () => {
      const actualPath = path.join(getTmpDir(), "mixedCasingFile");
      await createFile(actualPath);

      const linkPath = path.join(getTmpDir(), "lInK");
      await fsPromises.symlink(actualPath, linkPath);

      assert.equal(await getFileTrueCase(getTmpDir(), "link"), "lInK");
    });

    it("Should throw FileNotFoundError if not found", async () => {
      const actualPath = path.join(getTmpDir(), "not-exists");

      await assert.rejects(getFileTrueCase(getTmpDir(), "not-exists"), {
        name: "FileNotFoundError",
        message: `File ${actualPath} not found`,
      });
    });

    it("Should throw NotADirectoryError if the starting directory is not a directory", async () => {
      const filePath = path.join(getTmpDir(), "file");
      await createFile(filePath);

      await assert.rejects(getFileTrueCase(filePath, "asd"), {
        name: "NotADirectoryError",
        message: `Path ${filePath} is not a directory`,
      });
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async () => {
      const linkPath = path.join(getTmpDir(), "link");
      await fsPromises.symlink(linkPath, linkPath);

      await assert.rejects(getFileTrueCase(linkPath, "file"), {
        name: "FileSystemAccessError",
      });
    });
  });

  describe("isDirectory", () => {
    it("Should return true if the path is a directory", async () => {
      const dirPath = path.join(getTmpDir(), "dir");
      await mkdir(dirPath);

      assert.ok(
        await isDirectory(dirPath),
        "Should return true for a directory",
      );
    });

    it("Should return false if the path is not a directory", async () => {
      const filePath = path.join(getTmpDir(), "file");
      await createFile(filePath);

      assert.ok(
        !(await isDirectory(filePath)),
        "Should return false for a file",
      );
    });

    it("Should throw FileNotFoundError if the path doesn't exist", async () => {
      const actualPath = path.join(getTmpDir(), "not-exists");

      await assert.rejects(isDirectory(actualPath), {
        name: "FileNotFoundError",
        message: `File ${actualPath} not found`,
      });
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async () => {
      // As a directory with no permissions can still be accessed by stat, we need
      // to pass a path that is not a valid directory path, for example a null byte.
      const invalidPath = "\0";

      await assert.rejects(isDirectory(invalidPath), {
        name: "FileSystemAccessError",
      });
    });
  });

  describe("readJsonFile", () => {
    it("Should read and parse a JSON file", async () => {
      const expectedObject = { a: 1, b: 2 };
      const filePath = path.join(getTmpDir(), "file.json");
      await writeUtf8File(filePath, JSON.stringify(expectedObject));

      assert.deepEqual(await readJsonFile(filePath), expectedObject);
      expectTypeOf(await readJsonFile(filePath)).toBeUnknown();
      expectTypeOf(
        await readJsonFile<{ a: number; b: number }>(filePath),
      ).toMatchTypeOf<{ a: number; b: number }>();
    });

    it("Should throw InvalidFileFormatError if the file is not valid JSON", async () => {
      const filePath = path.join(getTmpDir(), "file.json");
      await writeUtf8File(filePath, "not-json");

      await assert.rejects(readJsonFile(filePath), {
        name: "InvalidFileFormatError",
        message: `Invalid file format: ${filePath}`,
      });
    });

    it("Should throw FileNotFoundError if the file doesn't exist", async () => {
      const filePath = path.join(getTmpDir(), "not-exists.json");

      await assert.rejects(readJsonFile(filePath), {
        name: "FileNotFoundError",
        message: `File ${filePath} not found`,
      });
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async () => {
      const invalidPath = "\0";

      await assert.rejects(readJsonFile(invalidPath), {
        name: "FileSystemAccessError",
      });
    });
  });

  describe("writeJsonFile", () => {
    it("Should write an object to a JSON file", async () => {
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

    it("Should write an object tto a JSON file even if part of the path doesn't exist", async () => {
      const expectedObject = { a: 1, b: 2 };
      const filePath = path.join(getTmpDir(), "not-exists", "file.json");

      await writeJsonFile(filePath, expectedObject);

      assert.deepEqual(
        JSON.parse(await readUtf8File(filePath)),
        expectedObject,
      );
    });

    it("Should throw JsonSerializationError if the object can't be serialized to JSON", async () => {
      const filePath = path.join(getTmpDir(), "file.json");
      // create an object with a circular reference
      const circularObject: { self?: {} } = {};
      circularObject.self = circularObject;

      await assert.rejects(writeJsonFile(filePath, circularObject), {
        name: "JsonSerializationError",
        message: `Error serializing JSON file ${filePath}`,
      });
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async () => {
      // Use a path that will cause a file system error (invalid characters in filename)
      const filePath = path.join(getTmpDir(), "invalid\0filename.json");

      await assert.rejects(writeJsonFile(filePath, {}), {
        name: "FileSystemAccessError",
      });
    });
  });

  describe("readJsonFileAsStream", () => {
    it("Should read and parse a JSON file", async () => {
      const expectedObject = { a: 1, b: 2 };
      const filePath = path.join(getTmpDir(), "file.json");
      await writeUtf8File(filePath, JSON.stringify(expectedObject));

      assert.deepEqual(await readJsonFileAsStream(filePath), expectedObject);
      expectTypeOf(await readJsonFileAsStream(filePath)).toBeUnknown();
      expectTypeOf(
        await readJsonFileAsStream<{ a: number; b: number }>(filePath),
      ).toMatchTypeOf<{ a: number; b: number }>();
    });

    it("Should throw InvalidFileFormatError if the file is not valid JSON", async () => {
      const filePath = path.join(getTmpDir(), "file.json");
      await writeUtf8File(filePath, "not-json");

      await assert.rejects(readJsonFileAsStream(filePath), {
        name: "InvalidFileFormatError",
        message: `Invalid file format: ${filePath}`,
      });
    });

    it("Should throw InvalidFileFormatError if the file is empty", async () => {
      const filePath = path.join(getTmpDir(), "file.json");
      await writeUtf8File(filePath, "");

      await assert.rejects(readJsonFileAsStream(filePath), {
        name: "InvalidFileFormatError",
        message: `Invalid file format: ${filePath}`,
      });
    });

    it("Should throw FileNotFoundError if the file doesn't exist", async () => {
      const filePath = path.join(getTmpDir(), "not-exists.json");

      await assert.rejects(readJsonFileAsStream(filePath), {
        name: "FileNotFoundError",
        message: `File ${filePath} not found`,
      });
    });

    it("Should throw IsDirectoryError if the file is a directory", async () => {
      const filePath = path.join(getTmpDir());

      await assert.rejects(readJsonFileAsStream(filePath), {
        name: "IsDirectoryError",
        message: `Path ${filePath} is a directory`,
      });
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async () => {
      const invalidPath = "\0";

      await assert.rejects(readJsonFileAsStream(invalidPath), {
        name: "FileSystemAccessError",
      });
    });
  });

  describe("writeJsonFileAsStream", () => {
    it("Should write an object to a JSON file", async () => {
      const expectedObject = { a: 1, b: 2 };
      const filePath = path.join(getTmpDir(), "file.json");

      await writeJsonFileAsStream(filePath, expectedObject);

      assert.deepEqual(
        JSON.parse(await readUtf8File(filePath)),
        expectedObject,
      );
      expectTypeOf(
        writeJsonFile<{ a: number; b: number }>(filePath, expectedObject),
      );
    });

    it("Should write an object tto a JSON file even if part of the path doesn't exist", async () => {
      const expectedObject = { a: 1, b: 2 };
      const filePath = path.join(getTmpDir(), "not-exists", "file.json");

      await writeJsonFileAsStream(filePath, expectedObject);

      assert.deepEqual(
        JSON.parse(await readUtf8File(filePath)),
        expectedObject,
      );
    });

    it("Should throw JsonSerializationError if the object can't be serialized to JSON", async () => {
      const filePath = path.join(getTmpDir(), "file.json");
      // create an object with a circular reference
      const circularObject: { self?: {} } = {};
      circularObject.self = circularObject;

      await assert.rejects(writeJsonFileAsStream(filePath, circularObject), {
        name: "JsonSerializationError",
        message: `Error serializing JSON file ${filePath}`,
      });
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async () => {
      // Use a path that will cause a file system error (invalid characters in filename)
      const filePath = path.join(getTmpDir(), "invalid\0filename.json");

      await assert.rejects(writeJsonFileAsStream(filePath, {}), {
        name: "FileSystemAccessError",
      });
    });

    it("Should remove the part of the path that didn't exist before if an error is thrown", async () => {
      const dirPath = path.join(getTmpDir(), "not-exists");
      const filePath = path.join(dirPath, "protected-file.json");
      // create an object with a circular reference
      const circularObject: { self?: {} } = {};
      circularObject.self = circularObject;

      await assert.rejects(writeJsonFileAsStream(filePath, circularObject), {
        name: "JsonSerializationError",
        message: `Error serializing JSON file ${filePath}`,
      });

      assert.ok(!(await exists(dirPath)), "The directory should not exist");
    });
  });

  describe("readUtf8File", () => {
    it("Should read a file and return its content as a string", async () => {
      const content = "hello";
      const filePath = path.join(getTmpDir(), "file.txt");
      await writeUtf8File(filePath, content);

      assert.equal(await readUtf8File(filePath), content);
      expectTypeOf(await readUtf8File(filePath)).toMatchTypeOf<string>();
    });

    it("Should throw IsDirectoryError if the path is a dir and not a file", async () => {
      const dirPath = path.join(getTmpDir(), "dir-name");
      await mkdir(dirPath);

      await assert.rejects(readUtf8File(dirPath), {
        name: "IsDirectoryError",
        message: `Path ${dirPath} is a directory`,
      });
    });

    it("Should throw FileNotFoundError if the file doesn't exist", async () => {
      const filePath = path.join(getTmpDir(), "not-exists.txt");

      await assert.rejects(readUtf8File(filePath), {
        name: "FileNotFoundError",
        message: `File ${filePath} not found`,
      });
    });

    it("Should throw IsDirectoryError if the path is a dir and not a file", async () => {
      const dirPath = path.join(getTmpDir(), "dir-name");
      await mkdir(dirPath);

      await assert.rejects(readUtf8File(dirPath), {
        name: "IsDirectoryError",
        message: `Path ${dirPath} is a directory`,
      });
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async () => {
      const invalidPath = "\0";

      await assert.rejects(readUtf8File(invalidPath), {
        name: "FileSystemAccessError",
      });
    });
  });

  describe("writeUtf8File", () => {
    it("Should write a string to a file", async () => {
      const content = "hello";
      const filePath = path.join(getTmpDir(), "file.txt");

      await writeUtf8File(filePath, content);

      assert.equal(await readUtf8File(filePath), content);
    });

    it("Should write a string to a file even if part of the path doesn't exist", async () => {
      const content = "hello";
      const filePath = path.join(getTmpDir(), "not-exists", "file.txt");

      await writeUtf8File(filePath, content);

      assert.equal(await readUtf8File(filePath), content);
    });

    it("Should allow setting the flag", async () => {
      const content = "hello";
      const filePath = path.join(getTmpDir(), "file.txt");

      await writeUtf8File(filePath, content);
      await writeUtf8File(filePath, content, "a");

      assert.equal(await readUtf8File(filePath), `${content}${content}`);
    });

    it("Should throw FileAlreadyExistsError if the file already exists and the flag 'x' is used", async () => {
      const filePath = path.join(getTmpDir(), "file.txt");
      await writeUtf8File(filePath, "hello");

      await assert.rejects(writeUtf8File(filePath, "hello", "wx"), {
        name: "FileAlreadyExistsError",
        message: `File ${filePath} already exists`,
      });
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async () => {
      // Use a path that will cause a file system error (invalid characters in filename)
      const filePath = path.join(getTmpDir(), "invalid\0filename.txt");

      await assert.rejects(writeUtf8File(filePath, "hello"), {
        name: "FileSystemAccessError",
      });
    });
  });

  describe("readBinaryFile", () => {
    it("Should read a file and return its content as a string", async () => {
      const content = "hello";
      const filePath = path.join(getTmpDir(), "file.txt");

      await writeUtf8File(filePath, content);

      const encoder = new TextEncoder();
      const binaryContent = encoder.encode(content);

      assert.deepEqual(await readBinaryFile(filePath), binaryContent);
      expectTypeOf(await readBinaryFile(filePath)).toMatchTypeOf<Uint8Array>();
    });

    it("Should throw IsDirectoryError if the path is a dir and not a file", async () => {
      const dirPath = path.join(getTmpDir(), "dir-name");

      await mkdir(dirPath);

      await assert.rejects(readBinaryFile(dirPath), {
        name: "IsDirectoryError",
        message: `Path ${dirPath} is a directory`,
      });
    });

    it("Should throw FileNotFoundError if the file doesn't exist", async () => {
      const filePath = path.join(getTmpDir(), "not-exists.txt");

      await assert.rejects(readBinaryFile(filePath), {
        name: "FileNotFoundError",
        message: `File ${filePath} not found`,
      });
    });

    it("Should throw IsDirectoryError if the path is a dir and not a file", async () => {
      const dirPath = path.join(getTmpDir(), "dir-name");

      await mkdir(dirPath);

      await assert.rejects(readBinaryFile(dirPath), {
        name: "IsDirectoryError",
        message: `Path ${dirPath} is a directory`,
      });
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async () => {
      const invalidPath = "\0";

      await assert.rejects(readBinaryFile(invalidPath), {
        name: "FileSystemAccessError",
      });
    });
  });

  describe("readdir", () => {
    it("Should return the files in a directory", async () => {
      const dirPath = path.join(getTmpDir(), "dir");
      await mkdir(dirPath);

      const files = ["file1.txt", "file2.txt", "file3.json"];
      for (const file of files) {
        await createFile(path.join(dirPath, file));
      }

      const subDirPath = path.join(dirPath, "subdir");
      await mkdir(subDirPath);
      await createFile(path.join(subDirPath, "file4.txt"));

      // should include the subdir but not its content as it's not recursive
      assert.deepEqual(
        new Set(await readdir(dirPath)),
        new Set(["file1.txt", "file2.txt", "file3.json", "subdir"]),
      );
    });

    it("Should throw FileNotFoundError if the directory doesn't exist", async () => {
      const dirPath = path.join(getTmpDir(), "not-exists");

      await assert.rejects(readdir(dirPath), {
        name: "FileNotFoundError",
        message: `File ${dirPath} not found`,
      });
    });

    it("Should throw NotADirectoryError if the path is not a directory", async () => {
      const filePath = path.join(getTmpDir(), "file");
      await createFile(filePath);

      await assert.rejects(readdir(filePath), {
        name: "NotADirectoryError",
        message: `Path ${filePath} is not a directory`,
      });
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async () => {
      const invalidPath = "\0";

      await assert.rejects(readdir(invalidPath), {
        name: "FileSystemAccessError",
      });
    });
  });

  describe("mkdir", () => {
    it("Should create a directory", async () => {
      const dirPath = path.join(getTmpDir(), "dir");

      await mkdir(dirPath);

      assert.ok(await isDirectory(dirPath), "Should create a directory");
    });

    it("Should create a directory and any necessary directories along the way", async () => {
      const dirPath = path.join(getTmpDir(), "dir", "subdir");

      await mkdir(dirPath);

      assert.ok(await isDirectory(dirPath), "Should create a directory");
    });

    it("Should do nothing if the directory already exists", async () => {
      const dirPath = path.join(getTmpDir(), "dir");

      await mkdir(dirPath);
      await mkdir(dirPath);

      assert.ok(await isDirectory(dirPath), "Should create a directory");
    });

    it("Should throw FileSystemAccessError for any error", async () => {
      const invalidPath = "\0";

      await assert.rejects(mkdir(invalidPath), {
        name: "FileSystemAccessError",
      });
    });
  });

  describe("mkdtemp", () => {
    it("Should create a temporary directory with the given prefix", async () => {
      const tempDir = await mkdtemp("test-");
      assert.ok(await isDirectory(tempDir), "Should create a directory");
      assert.ok(
        path.basename(tempDir).startsWith("test-"),
        "The directory name should start with the prefix",
      );
    });

    it("Should throw FileSystemAccessError for any error", async () => {
      const invalidPath = "\0";

      await assert.rejects(mkdtemp(invalidPath), {
        name: "FileSystemAccessError",
      });
    });
  });

  describe("getChangeTime", () => {
    it("Should return the change time of a file", async () => {
      const filePath = path.join(getTmpDir(), "file.txt");
      await createFile(filePath);

      const stats = await fsPromises.stat(filePath);

      assert.equal(
        stats.ctime.getTime(),
        (await getChangeTime(filePath)).getTime(),
      );
    });

    it("Should throw FileNotFoundError if the file doesn't exist", async () => {
      const filePath = path.join(getTmpDir(), "not-exists.txt");

      await assert.rejects(getChangeTime(filePath), {
        name: "FileNotFoundError",
        message: `File ${filePath} not found`,
      });
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async () => {
      const invalidPath = "\0";

      await assert.rejects(getChangeTime(invalidPath), {
        name: "FileSystemAccessError",
      });
    });
  });

  describe("getAccessTime", () => {
    it("Should return the access time of a file", async () => {
      const filePath = path.join(getTmpDir(), "file.txt");
      await createFile(filePath);

      const stats = await fsPromises.stat(filePath);

      assert.equal(
        stats.atime.getTime(),
        (await getAccessTime(filePath)).getTime(),
      );
    });

    it("Should throw FileNotFoundError if the file doesn't exist", async () => {
      const filePath = path.join(getTmpDir(), "not-exists.txt");

      await assert.rejects(getAccessTime(filePath), {
        name: "FileNotFoundError",
        message: `File ${filePath} not found`,
      });
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async () => {
      const invalidPath = "\0";

      await assert.rejects(getAccessTime(invalidPath), {
        name: "FileSystemAccessError",
      });
    });
  });

  describe("getSize", () => {
    it("Should return the size of a file", async () => {
      const filePath = path.join(getTmpDir(), "file.txt");
      await createFile(filePath);

      const stats = await fsPromises.stat(filePath);

      assert.equal(stats.size, await getFileSize(filePath));
    });

    it("Should throw FileNotFoundError if the file doesn't exist", async () => {
      const filePath = path.join(getTmpDir(), "not-exists.txt");

      await assert.rejects(getFileSize(filePath), {
        name: "FileNotFoundError",
        message: `File ${filePath} not found`,
      });
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async () => {
      const invalidPath = "\0";

      await assert.rejects(getFileSize(invalidPath), {
        name: "FileSystemAccessError",
      });
    });
  });

  describe("exists", () => {
    it("Should return true if the file exists", async () => {
      const filePath = path.join(getTmpDir(), "file.txt");
      await createFile(filePath);

      assert.ok(
        await exists(filePath),
        "Should return true for an existing file",
      );
    });

    it("Should return false if the file doesn't exist", async () => {
      const filePath = path.join(getTmpDir(), "not-exists.txt");

      assert.ok(
        !(await exists(filePath)),
        "Should return false for a non-existing file",
      );
    });
  });

  describe("copy", () => {
    it("Should copy a file", async () => {
      const srcPath = path.join(getTmpDir(), "src.txt");
      const destPath = path.join(getTmpDir(), "dest.txt");

      await writeUtf8File(srcPath, "hello");
      await copy(srcPath, destPath);

      assert.equal(await readUtf8File(destPath), "hello");
    });

    it("Should throw FileNotFoundError if the source file doesn't exist", async () => {
      const srcPath = path.join(getTmpDir(), "not-exists.txt");
      const destPath = path.join(getTmpDir(), "dest.txt");

      await assert.rejects(copy(srcPath, destPath), {
        name: "FileNotFoundError",
        message: `File ${srcPath} not found`,
      });
    });

    it("Should throw FileNotFoundError if the destination path doesn't exist", async () => {
      const srcPath = path.join(getTmpDir(), "src.txt");
      const destPath = path.join(getTmpDir(), "not-exists", "dest.txt");

      await createFile(srcPath);

      await assert.rejects(copy(srcPath, destPath), {
        name: "FileNotFoundError",
        message: `File ${destPath} not found`,
      });
    });

    it("Should throw IsDirectoryError if the source path is a directory", async () => {
      const srcPath = path.join(getTmpDir(), "dir");
      const destPath = path.join(getTmpDir(), "dest.txt");

      await mkdir(srcPath);

      await assert.rejects(copy(srcPath, destPath), {
        name: "IsDirectoryError",
        message: `Path ${srcPath} is a directory`,
      });
    });

    it("Should throw IsDirectoryError if the destination path is a directory", async () => {
      const srcPath = path.join(getTmpDir(), "src.txt");
      const destPath = path.join(getTmpDir(), "dir");

      await createFile(srcPath);
      await mkdir(destPath);

      await assert.rejects(copy(srcPath, destPath), {
        name: "IsDirectoryError",
        message: `Path ${destPath} is a directory`,
      });
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async () => {
      const invalidPath = "\0";
      const destPath = path.join(getTmpDir(), "dest.txt");

      await assert.rejects(copy(invalidPath, destPath), {
        name: "FileSystemAccessError",
      });
    });
  });

  describe("remove", () => {
    it("Should remove a file", async () => {
      const filePath = path.join(getTmpDir(), "file.txt");
      await createFile(filePath);

      await remove(filePath);

      assert.ok(!(await exists(filePath)), "Should remove a file");
    });

    it("Should remove an empty directory", async () => {
      const dirPath = path.join(getTmpDir(), "dir");
      await mkdir(dirPath);

      await remove(dirPath);

      assert.ok(!(await exists(dirPath)), "Should remove a directory");
    });

    it("Should remove a directory and its content", async () => {
      const dirPath = path.join(getTmpDir(), "dir");
      await mkdir(dirPath);

      const files = ["file1.txt", "file2.txt", "file3.json"];
      for (const file of files) {
        await createFile(path.join(dirPath, file));
      }

      const subDirPath = path.join(dirPath, "subdir");
      await mkdir(subDirPath);
      await createFile(path.join(subDirPath, "file4.txt"));

      await remove(dirPath);

      assert.ok(!(await exists(dirPath)), "Should remove a directory");
    });

    it("Should not throw if the path doesn't exist", async () => {
      const filePath = path.join(getTmpDir(), "not-exists.txt");

      await remove(filePath);
    });

    it("Should throw FileSystemAccessError for any error", async () => {
      const invalidPath = "\0";

      await assert.rejects(remove(invalidPath), {
        name: "FileSystemAccessError",
      });
    });

    it("Should throw busy error on windows platform", async () => {
      const dirPath = path.join(getTmpDir(), "lockTest");
      await mkdir(dirPath);
      const filePath = path.join(dirPath, "file.txt");
      await createFile(filePath);
      const UV_FS_O_EXLOCK = 0x10000000;
      const fd = await fsPromises.open(
        filePath,
        // eslint-disable-next-line no-bitwise -- Using bitwise OR to combine file open flags
        fsPromises.constants.O_RDONLY | UV_FS_O_EXLOCK,
      );

      if (process.platform === "win32") {
        await assert.rejects(remove(filePath), {
          name: "FileSystemAccessError",
          message: /EBUSY: resource busy or locked, unlink/,
        });
      }
      await fd.close();
      await remove(dirPath);
      assert.ok(!(await exists(dirPath)), "Should remove a directory");
    });
  });

  describe("chmod", () => {
    it("Should change the mode of a file", async () => {
      const filePath = path.join(getTmpDir(), "file.txt");
      await createFile(filePath);

      await chmod(filePath, 0o666);

      const stats = await fsPromises.stat(filePath);

      // eslint-disable-next-line no-bitwise -- Bitwise is common in fs permissions
      assert.equal(stats.mode & 0o777, 0o666);
    });

    it("Should throw FileNotFoundError if the file doesn't exist", async () => {
      const filePath = path.join(getTmpDir(), "not-exists.txt");

      await assert.rejects(chmod(filePath, 0o666), {
        name: "FileNotFoundError",
        message: `File ${filePath} not found`,
      });
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async () => {
      const invalidPath = "\0";

      await assert.rejects(chmod(invalidPath, 0o666), {
        name: "FileSystemAccessError",
      });
    });
  });

  describe("move", () => {
    it("Should move a file", async () => {
      const srcPath = path.join(getTmpDir(), "src.txt");
      const destPath = path.join(getTmpDir(), "dest.txt");

      await writeUtf8File(srcPath, "hello");
      await move(srcPath, destPath);

      assert.equal(await readUtf8File(destPath), "hello");
      assert.ok(!(await exists(srcPath)), "Should remove the source file");
    });

    it("Should move a directory", async () => {
      const srcPath = path.join(getTmpDir(), "dir");
      const destPath = path.join(getTmpDir(), "dest");

      await mkdir(srcPath);
      await createFile(path.join(srcPath, "file.txt"));

      await move(srcPath, destPath);

      assert.ok(!(await exists(srcPath)), "Should remove the source directory");
      assert.ok(
        await exists(destPath),
        "Should create the destination directory",
      );
      assert.ok(
        await exists(path.join(destPath, "file.txt")),
        "Should move the file",
      );
    });

    it("Should throw FileNotFoundError if the source file doesn't exist", async () => {
      const srcPath = path.join(getTmpDir(), "not-exists.txt");
      const destPath = path.join(getTmpDir(), "dest.txt");

      await assert.rejects(move(srcPath, destPath), {
        name: "FileNotFoundError",
        message: `File ${srcPath} not found`,
      });
    });

    it("Should throw FileNotFoundError if the destination path doesn't exist", async () => {
      const srcPath = path.join(getTmpDir(), "src.txt");
      const destPath = path.join(getTmpDir(), "not-exists", "dest.txt");

      await createFile(srcPath);

      await assert.rejects(move(srcPath, destPath), {
        name: "FileNotFoundError",
        message: `File ${destPath} not found`,
      });
    });

    it("Should throw DirectoryNotEmptyError if the source path is a directory and the destination path is a directory that is not empty", async () => {
      const srcPath = path.join(getTmpDir(), "dir");
      const destPath = path.join(getTmpDir(), "dest");

      await mkdir(srcPath);
      await mkdir(destPath);
      await createFile(path.join(destPath, "file.txt"));

      await assert.rejects(move(srcPath, destPath), {
        name: "DirectoryNotEmptyError",
        message: `Directory ${destPath} is not empty`,
      });
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async () => {
      const invalidPath = "\0";
      const destPath = path.join(getTmpDir(), "dest.txt");

      await assert.rejects(move(invalidPath, destPath), {
        name: "FileSystemAccessError",
      });
    });
  });

  describe("createFile", () => {
    it("Should create a file", async () => {
      const filePath = path.join(getTmpDir(), "file.txt");

      await createFile(filePath);

      assert.ok(await exists(filePath), "Should create a file");
    });

    it("Should create a file even if part of the path doesn't exist", async () => {
      const filePath = path.join(getTmpDir(), "not-exists", "file.txt");

      await createFile(filePath);

      assert.ok(await exists(filePath), "Should create a file");
    });

    it("Should throw FileSystemAccessError for any error", async () => {
      const invalidPath = "\0";

      await assert.rejects(createFile(invalidPath), {
        name: "FileSystemAccessError",
      });
    });
  });

  describe("emptyDir", () => {
    it("Should empty a directory", async () => {
      const dirPath = path.join(getTmpDir(), "dir");
      await mkdir(dirPath);

      const files = ["file1.txt", "file2.txt", "file3.json"];
      for (const file of files) {
        await createFile(path.join(dirPath, file));
      }

      await emptyDir(dirPath);

      assert.ok(await isDirectory(dirPath), "Should keep the directory");
      assert.deepEqual(await readdir(dirPath), []);
    });

    it("Should preserve the directory permissions", async () => {
      const dirPath = path.join(getTmpDir(), "dir");
      await mkdir(dirPath);
      await chmod(dirPath, 0o666);

      await emptyDir(dirPath);

      // eslint-disable-next-line no-bitwise -- Bitwise is common in fs permissions
      assert.equal((await fsPromises.stat(dirPath)).mode & 0o777, 0o666);
    });

    it("Should create the directory if it doesn't exist", async () => {
      const dirPath = path.join(getTmpDir(), "not-exists");

      await emptyDir(dirPath);

      assert.ok(await isDirectory(dirPath), "Should create the directory");
      assert.deepEqual(await readdir(dirPath), []);
    });

    it("Should throw NotADirectoryError if the path is not a directory", async () => {
      const filePath = path.join(getTmpDir(), "file");
      await createFile(filePath);

      await assert.rejects(emptyDir(filePath), {
        name: "NotADirectoryError",
        message: `Path ${filePath} is not a directory`,
      });
    });

    it("Should throw FileSystemAccessError for any error", async () => {
      const invalidPath = "\0";

      await assert.rejects(emptyDir(invalidPath), {
        name: "FileSystemAccessError",
      });
    });
  });

  describe("findUp", () => {
    it("Should find a file in the current directory", async () => {
      const filePath = path.join(getTmpDir(), "file.txt");
      await createFile(filePath);

      assert.equal(await findUp("file.txt", getTmpDir()), filePath);
    });

    it("Should find a file in a parent directory", async () => {
      const filePath = path.join(getTmpDir(), "file.txt");
      await createFile(filePath);

      assert.equal(
        await findUp("file.txt", path.join(getTmpDir(), "subdir")),
        filePath,
      );
    });

    it("Should return undefined if the file is not found", async () => {
      assert.equal(await findUp("not-exists.txt"), undefined);
    });
  });
});
