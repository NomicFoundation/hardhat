// cSpell:ignore APFS ambig AMBIG Ambig
import type { Dirent } from "node:fs";

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
  TrueCasePathResolver,
  isDirectory,
  mkdir,
  move,
  readJsonFile,
  readUtf8File,
  readdir,
  remove,
  symlink,
  writeJsonFile,
  writeUtf8File,
  readBinaryFile,
  getAccessTime,
  getFileSize,
  readJsonFileAsStream,
  writeJsonFileAsStream,
  mkdtemp,
  readdirOrEmpty,
} from "../src/fs.js";

import { createTmpDir } from "./helpers/fs.js";

function withUnknownDirentType(dirent: Dirent): Dirent {
  const cloned: Dirent = Object.create(dirent);
  cloned.isDirectory = () => false;
  cloned.isFile = () => false;
  cloned.isSymbolicLink = () => false;
  cloned.isBlockDevice = () => false;
  cloned.isCharacterDevice = () => false;
  cloned.isFIFO = () => false;
  cloned.isSocket = () => false;
  return cloned;
}

function withKnownFileDirentType(dirent: Dirent): Dirent {
  const cloned: Dirent = Object.create(dirent);
  cloned.isDirectory = () => false;
  cloned.isFile = () => true;
  cloned.isSymbolicLink = () => false;
  cloned.isBlockDevice = () => false;
  cloned.isCharacterDevice = () => false;
  cloned.isFIFO = () => false;
  cloned.isSocket = () => false;
  return cloned;
}

describe("File system utils", () => {
  const tmp = createTmpDir("fs", "test");

  describe("getRealPath", () => {
    it("Should resolve symlinks", async () => {
      const actualPath = path.join(tmp.path, "mixedCasingFile");
      await createFile(actualPath);

      const linkPath = path.join(tmp.path, "link");
      await fsPromises.symlink(actualPath, linkPath);

      assert.equal(await getRealPath(linkPath), actualPath);
    });

    it("Should normalize the path", async () => {
      const actualPath = path.join(tmp.path, "file");
      await createFile(actualPath);

      const filePath = path.join(tmp.path, "a", "..", ".", "", "file");

      assert.equal(await getRealPath(filePath), actualPath);
    });

    it("Should throw FileNotFoundError if not found", async () => {
      const actualPath = path.join(tmp.path, "not-exists");

      await assert.rejects(getRealPath(actualPath), {
        name: "FileNotFoundError",
        message: `File ${actualPath} not found`,
      });
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async () => {
      const linkPath = path.join(tmp.path, "link");
      await fsPromises.symlink(linkPath, linkPath);

      await assert.rejects(getRealPath(linkPath), {
        name: "FileSystemAccessError",
      });
    });
  });

  describe("getAllFilesMatching", () => {
    beforeEach(async () => {
      await mkdir(path.join(tmp.path, "dir-empty"));
      await mkdir(path.join(tmp.path, "dir-with-files", "dir-within-dir"));
      await mkdir(path.join(tmp.path, "dir-with-extension.txt"));
      await mkdir(path.join(tmp.path, "dir-WithCasing"));

      // root files
      await createFile(path.join(tmp.path, "file-1.txt"));
      await createFile(path.join(tmp.path, "file-2.txt"));
      await createFile(path.join(tmp.path, "file-3.json"));

      // dir-with-files files
      await createFile(
        path.join(tmp.path, "dir-with-files", "inner-file-1.json"),
      );
      await createFile(
        path.join(tmp.path, "dir-with-files", "inner-file-2.txt"),
      );

      // dir-with-files/dir-within-dir files
      await createFile(
        path.join(tmp.path, "dir-with-files", "dir-within-dir", "file-deep"),
      );

      // dir-with-extension.txt files
      await createFile(
        path.join(tmp.path, "dir-with-extension.txt", "inner-file-3.txt"),
      );
      await createFile(
        path.join(tmp.path, "dir-with-extension.txt", "inner-file-4.json"),
      );

      // dir-WithCasing files
      await createFile(
        path.join(tmp.path, "dir-WithCasing", "file-WithCASING"),
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
        path.join(tmp.path, "not-in-fs"),
        undefined,
        [],
      );
    });

    it("Should return an empty array if the dir is empty", async () => {
      await assertGetAllFilesMatching(
        path.join(tmp.path, "dir-empty"),
        undefined,
        [],
      );
    });

    it("Should return an empty array if no file matches", async () => {
      await assertGetAllFilesMatching(tmp.path, () => false, []);
    });

    it("Should return every file by default, recursively", async () => {
      await assertGetAllFilesMatching(tmp.path, undefined, [
        path.join(tmp.path, "file-1.txt"),
        path.join(tmp.path, "file-2.txt"),
        path.join(tmp.path, "file-3.json"),
        path.join(tmp.path, "dir-with-files", "inner-file-1.json"),
        path.join(tmp.path, "dir-with-files", "inner-file-2.txt"),
        path.join(tmp.path, "dir-with-extension.txt", "inner-file-3.txt"),
        path.join(tmp.path, "dir-with-extension.txt", "inner-file-4.json"),
        path.join(tmp.path, "dir-WithCasing", "file-WithCASING"),
        path.join(tmp.path, "dir-with-files", "dir-within-dir", "file-deep"),
      ]);

      await assertGetAllFilesMatching(
        path.join(tmp.path, "dir-WithCasing"),
        undefined,
        [path.join(tmp.path, "dir-WithCasing", "file-WithCASING")],
      );
    });

    it("Should filter files and not dirs", async () => {
      await assertGetAllFilesMatching(tmp.path, (f) => f.endsWith(".txt"), [
        path.join(tmp.path, "file-1.txt"),
        path.join(tmp.path, "file-2.txt"),
        path.join(tmp.path, "dir-with-files", "inner-file-2.txt"),
        path.join(tmp.path, "dir-with-extension.txt", "inner-file-3.txt"),
      ]);

      await assertGetAllFilesMatching(tmp.path, (f) => !f.endsWith(".txt"), [
        path.join(tmp.path, "file-3.json"),
        path.join(tmp.path, "dir-with-files", "inner-file-1.json"),
        path.join(tmp.path, "dir-with-extension.txt", "inner-file-4.json"),
        path.join(tmp.path, "dir-WithCasing", "file-WithCASING"),
        path.join(tmp.path, "dir-with-files", "dir-within-dir", "file-deep"),
      ]);
    });

    it("Should filter files asynchronously", async () => {
      await writeUtf8File(path.join(tmp.path, "file-1.txt"), "skip");

      await assertGetAllFilesMatching(
        tmp.path,
        async (f) => {
          return f.endsWith(".txt") && (await readUtf8File(f)) !== "skip";
        },
        [
          path.join(tmp.path, "file-2.txt"),
          path.join(tmp.path, "dir-with-files", "inner-file-2.txt"),
          path.join(tmp.path, "dir-with-extension.txt", "inner-file-3.txt"),
        ],
      );
    });

    it("Should preserve the true casing of the files, except for the dir's path", async () => {
      await assertGetAllFilesMatching(
        tmp.path,
        (f) => f.toLowerCase().endsWith("withcasing"),
        [path.join(tmp.path, "dir-WithCasing", "file-WithCASING")],
      );
    });

    it("Should recurse into directories when the dirent type is unknown", async (t) => {
      const originalReaddir = fsPromises.readdir;
      const originalLstat = fsPromises.lstat;

      const unknownDirPath = path.join(tmp.path, "dir-with-files");
      const knownFilePath = path.join(tmp.path, "file-1.txt");
      const lstatPaths: string[] = [];

      t.mock.method(fsPromises, "readdir", async (...args: any[]) => {
        const [absolutePathToDir, options] = args;
        const dirents: Dirent[] = await Reflect.apply(
          originalReaddir,
          fsPromises,
          args,
        );

        if (absolutePathToDir !== tmp.path || options?.withFileTypes !== true) {
          return dirents;
        }

        return dirents.map((dirent) => {
          if (dirent.name === path.basename(unknownDirPath)) {
            return withUnknownDirentType(dirent);
          }

          if (dirent.name === path.basename(knownFilePath)) {
            return withKnownFileDirentType(dirent);
          }

          return dirent;
        });
      });

      t.mock.method(fsPromises, "lstat", async (...args: any[]) => {
        lstatPaths.push(String(args[0]));
        return await Reflect.apply(originalLstat, fsPromises, args);
      });

      const files = await getAllFilesMatching(tmp.path);

      assert.deepEqual(
        new Set(files),
        new Set([
          path.join(tmp.path, "file-1.txt"),
          path.join(tmp.path, "file-2.txt"),
          path.join(tmp.path, "file-3.json"),
          path.join(tmp.path, "dir-with-files", "inner-file-1.json"),
          path.join(tmp.path, "dir-with-files", "inner-file-2.txt"),
          path.join(tmp.path, "dir-with-extension.txt", "inner-file-3.txt"),
          path.join(tmp.path, "dir-with-extension.txt", "inner-file-4.json"),
          path.join(tmp.path, "dir-WithCasing", "file-WithCASING"),
          path.join(tmp.path, "dir-with-files", "dir-within-dir", "file-deep"),
        ]),
      );
      assert.ok(
        lstatPaths.includes(unknownDirPath),
        `expected lstat to be used for unknown dirent path ${unknownDirPath}`,
      );
      assert.ok(
        !lstatPaths.includes(knownFilePath),
        `expected lstat to not be used for known file path ${knownFilePath}`,
      );
    });

    it("Should throw NotADirectoryError if the path is not a directory", async () => {
      const dirPath = path.join(tmp.path, "file-1.txt");

      await assert.rejects(
        getAllFilesMatching(path.join(tmp.path, "file-1.txt")),
        {
          name: "NotADirectoryError",
          message: `Path ${dirPath} is not a directory`,
        },
      );
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async () => {
      const linkPath = path.join(tmp.path, "link");
      await fsPromises.symlink(linkPath, linkPath);

      await assert.rejects(getAllFilesMatching(linkPath), {
        name: "FileSystemAccessError",
      });
    });

    describe("With directoryFilter", () => {
      it("Should return an empty array if directoryFilter returns false", async () => {
        const from = path.join(tmp.path, "from");

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
        const from = path.join(tmp.path, "from");

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
      await mkdir(path.join(tmp.path, "dir-empty"));
      await mkdir(path.join(tmp.path, "dir-with-files"));
      await mkdir(path.join(tmp.path, "dir-with-subdir", "dir-within-dir"));
      await mkdir(path.join(tmp.path, "dir-with-extension.txt"));
      await mkdir(path.join(tmp.path, "dir-WithCasing"));

      await createFile(path.join(tmp.path, "dir-with-files", "file-1.txt"));
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
        path.join(tmp.path, "not-in-fs"),
        undefined,
        [],
      );
    });

    it("Should return an empty array if the dir is empty", async () => {
      await assertGetAllDirectoriesMatching(
        path.join(tmp.path, "dir-empty"),
        undefined,
        [],
      );
    });

    it("Should return an empty array if no file matches", async () => {
      await assertGetAllDirectoriesMatching(tmp.path, () => false, []);
    });

    it("Should return every dir by default, recursively, except for subdirs of matched dirs", async () => {
      await assertGetAllDirectoriesMatching(tmp.path, undefined, [
        path.join(tmp.path, "dir-empty"),
        path.join(tmp.path, "dir-with-files"),
        path.join(tmp.path, "dir-with-subdir"),
        path.join(tmp.path, "dir-with-extension.txt"),
        path.join(tmp.path, "dir-WithCasing"),
      ]);

      await assertGetAllDirectoriesMatching(
        path.join(tmp.path, "dir-with-subdir"),
        undefined,
        [path.join(tmp.path, "dir-with-subdir", "dir-within-dir")],
      );
    });

    it("Should filter dirs", async () => {
      await assertGetAllDirectoriesMatching(
        tmp.path,
        (d) => d.endsWith(".txt"),
        [path.join(tmp.path, "dir-with-extension.txt")],
      );
    });

    it("Should filter dirs asynchronously", async () => {
      await assertGetAllDirectoriesMatching(
        tmp.path,
        async (d) => (await getAllFilesMatching(d)).length !== 0,
        [path.join(tmp.path, "dir-with-files")],
      );
    });

    it("Should match directories when the dirent type is unknown", async (t) => {
      const originalReaddir = fsPromises.readdir;
      const originalLstat = fsPromises.lstat;

      const unknownDirPath = path.join(tmp.path, "dir-with-files");
      const lstatPaths: string[] = [];

      t.mock.method(fsPromises, "readdir", async (...args: any[]) => {
        const [absolutePathToDir, options] = args;
        const dirents: Dirent[] = await Reflect.apply(
          originalReaddir,
          fsPromises,
          args,
        );

        if (absolutePathToDir !== tmp.path || options?.withFileTypes !== true) {
          return dirents;
        }

        return dirents.map((dirent) =>
          dirent.name === path.basename(unknownDirPath)
            ? withUnknownDirentType(dirent)
            : dirent,
        );
      });

      t.mock.method(fsPromises, "lstat", async (...args: any[]) => {
        lstatPaths.push(String(args[0]));
        return await Reflect.apply(originalLstat, fsPromises, args);
      });

      const dirs = await getAllDirectoriesMatching(tmp.path);

      assert.deepEqual(
        new Set(dirs),
        new Set([
          path.join(tmp.path, "dir-empty"),
          path.join(tmp.path, "dir-with-files"),
          path.join(tmp.path, "dir-with-subdir"),
          path.join(tmp.path, "dir-with-extension.txt"),
          path.join(tmp.path, "dir-WithCasing"),
        ]),
      );
      assert.ok(
        lstatPaths.includes(unknownDirPath),
        `expected lstat to be used for unknown dirent path ${unknownDirPath}`,
      );
    });
  });

  describe("getFileTrueCase", () => {
    it("Should return the true case of files and dirs", async () => {
      const mixedCaseFilePath = path.join(tmp.path, "mixedCaseFile");
      const mixedCaseDirPath = path.join(tmp.path, "mixedCaseDir");
      const mixedCaseFile2Path = path.join(mixedCaseDirPath, "mixedCaseFile2");

      await createFile(mixedCaseFilePath);
      await mkdir(mixedCaseDirPath);
      await createFile(mixedCaseFile2Path);

      // We test mixedCaseFilePath from tmpdir
      assert.equal(
        await getFileTrueCase(tmp.path, "mixedCaseFile"),
        path.relative(tmp.path, mixedCaseFilePath),
      );
      assert.equal(
        await getFileTrueCase(tmp.path, "mixedcasefile"),
        path.relative(tmp.path, mixedCaseFilePath),
      );
      assert.equal(
        await getFileTrueCase(tmp.path, "MIXEDCASEFILE"),
        path.relative(tmp.path, mixedCaseFilePath),
      );

      // We test mixedCaseDirPath from tmpdir
      assert.equal(
        await getFileTrueCase(tmp.path, "mixedCaseDir"),
        path.relative(tmp.path, mixedCaseDirPath),
      );
      assert.equal(
        await getFileTrueCase(tmp.path, "mixedcasedir"),
        path.relative(tmp.path, mixedCaseDirPath),
      );
      assert.equal(
        await getFileTrueCase(tmp.path, "MIXEDCASEDIR"),
        path.relative(tmp.path, mixedCaseDirPath),
      );

      // We test mixedCaseFilePath2 from tmpdir
      assert.equal(
        await getFileTrueCase(
          tmp.path,
          path.join("mixedCaseDir", "mixedCaseFile2"),
        ),
        path.relative(tmp.path, mixedCaseFile2Path),
      );
      assert.equal(
        await getFileTrueCase(
          tmp.path,
          path.join("mixedcasedir", "MIXEDCASEFILE2"),
        ),
        path.relative(tmp.path, mixedCaseFile2Path),
      );
      assert.equal(
        await getFileTrueCase(
          tmp.path,
          path.join("MIXEDCASEDIR", "mixedcasefile2"),
        ),
        path.relative(tmp.path, mixedCaseFile2Path),
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
      const actualPath = path.join(tmp.path, "mixedCasingFile");
      await createFile(actualPath);

      const linkPath = path.join(tmp.path, "lInK");
      await fsPromises.symlink(actualPath, linkPath);

      assert.equal(await getFileTrueCase(tmp.path, "link"), "lInK");
    });

    it("Should throw FileNotFoundError if not found", async () => {
      const actualPath = path.join(tmp.path, "not-exists");

      await assert.rejects(getFileTrueCase(tmp.path, "not-exists"), {
        name: "FileNotFoundError",
        message: `File ${actualPath} not found`,
      });
    });

    it("Should throw NotADirectoryError if the starting directory is not a directory", async () => {
      const filePath = path.join(tmp.path, "file");
      await createFile(filePath);

      await assert.rejects(getFileTrueCase(filePath, "asd"), {
        name: "NotADirectoryError",
        message: `Path ${filePath} is not a directory`,
      });
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async () => {
      const linkPath = path.join(tmp.path, "link");
      await fsPromises.symlink(linkPath, linkPath);

      await assert.rejects(getFileTrueCase(linkPath, "file"), {
        name: "FileSystemAccessError",
      });
    });
  });

  describe("TrueCasePathResolver", () => {
    it("Should return the true case of files and directories", async () => {
      const mixedCaseFilePath = path.join(tmp.path, "mixedCaseFile");
      const mixedCaseDirPath = path.join(tmp.path, "mixedCaseDir");
      const mixedCaseFile2Path = path.join(mixedCaseDirPath, "mixedCaseFile2");

      await createFile(mixedCaseFilePath);
      await mkdir(mixedCaseDirPath);
      await createFile(mixedCaseFile2Path);

      const resolver = new TrueCasePathResolver();

      assert.equal(
        await resolver.getFileTrueCase(tmp.path, "mixedcasefile"),
        "mixedCaseFile",
      );
      assert.equal(
        await resolver.getFileTrueCase(tmp.path, "MIXEDCASEDIR"),
        "mixedCaseDir",
      );
      assert.equal(
        await resolver.getFileTrueCase(
          tmp.path,
          path.join("mixedcasedir", "MIXEDCASEFILE2"),
        ),
        path.join("mixedCaseDir", "mixedCaseFile2"),
      );
    });

    it("Should return an empty path when resolving the starting directory itself", async () => {
      const resolver = new TrueCasePathResolver();

      assert.equal(await resolver.getFileTrueCase(tmp.path, ""), "");
      assert.equal(await resolver.getFileTrueCase(tmp.path, "."), "");
      assert.equal(
        await resolver.getFileTrueCase(tmp.path, path.join("dir", "..")),
        "",
      );
    });

    it("Should resolve relative paths with parent segments that stay within the starting directory", async () => {
      const mixedCaseFilePath = path.join(tmp.path, "mixedCaseFile");
      const mixedCaseDirPath = path.join(tmp.path, "mixedCaseDir");

      await createFile(mixedCaseFilePath);
      await mkdir(mixedCaseDirPath);

      const resolver = new TrueCasePathResolver();

      assert.equal(
        await resolver.getFileTrueCase(
          tmp.path,
          path.join("mixedCaseDir", "..", "mixedcasefile"),
        ),
        "mixedCaseFile",
      );
    });

    it("Should throw FileNotFoundError if the resolved path escapes the starting directory", async () => {
      const rootPath = path.join(tmp.path, "root");
      const nestedPath = path.join(rootPath, "nested");
      const secretPath = path.join(tmp.path, "secret");

      await mkdir(nestedPath);
      await createFile(secretPath);

      const resolver = new TrueCasePathResolver();

      await assert.rejects(
        resolver.getFileTrueCase(
          rootPath,
          path.join("nested", "..", "..", "secret"),
        ),
        {
          name: "FileNotFoundError",
          message: `File ${secretPath} not found`,
        },
      );
    });

    it("Should cache directory listings across calls to the same resolver", async () => {
      const filePath = path.join(tmp.path, "cachedFile");
      await createFile(filePath);

      const resolver = new TrueCasePathResolver();

      assert.equal(
        await resolver.getFileTrueCase(tmp.path, "cachedFile"),
        "cachedFile",
      );

      // Remove the file behind the resolver's back; because both the
      // directory listing and the result are cached, subsequent lookups
      // should still succeed.
      await remove(filePath);

      assert.equal(
        await resolver.getFileTrueCase(tmp.path, "cachedFile"),
        "cachedFile",
      );
      assert.equal(
        await resolver.getFileTrueCase(tmp.path, "CACHEDFILE"),
        "cachedFile",
      );

      resolver.clear();

      await assert.rejects(resolver.getFileTrueCase(tmp.path, "cachedFile"), {
        name: "FileNotFoundError",
      });
    });

    it("Should cache resolutions separately for different trusted starting directories", async (t) => {
      const root = path.join(tmp.path, "root");
      const trustedFrom = path.join(root, "B"); // Note that it's uppercase

      // We mock `readdir` so that it mimics a case-insensitive filesystem where
      // root/b/foo.ts exists - Note the lowercase b.
      let numberOfCallsToReaddir = 0;
      t.mock.method(fsPromises, "readdir", async (...args: any[]) => {
        numberOfCallsToReaddir++;
        const dirPath = path.normalize(String(args[0]));

        if (dirPath === path.normalize(trustedFrom)) {
          return ["foo.ts"];
        }

        if (dirPath === path.normalize(root)) {
          return ["b"];
        }

        if (dirPath === path.normalize(path.join(root, "b"))) {
          return ["foo.ts"];
        }

        throw Object.assign(new Error(`Unexpected readdir: ${dirPath}`), {
          code: "ENOENT",
        });
      });

      const resolver = new TrueCasePathResolver();

      // Resolving from root/B, it readdirs root/B.
      assert.equal(
        await resolver.getFileTrueCase(trustedFrom, "foo.ts"),
        "foo.ts",
      );
      assert.equal(numberOfCallsToReaddir, 1);

      // Resolving from root, it readdirs root and root/b, not using the cache,
      // because the trusted starting directory is different.
      assert.equal(
        await resolver.getFileTrueCase(root, path.join("B", "foo.ts")),
        path.join("b", "foo.ts"),
      );
      assert.equal(numberOfCallsToReaddir, 3);
    });

    it("Should not resolve the true casing of the trusted starting directory", async (t) => {
      const trustedFrom = path.join(tmp.path, "a", "B");

      // We mock `readdir` so that only the trusted starting directory can be
      // read. If the resolver tries to read any ancestor of `from`, this test
      // fails.
      let numberOfCallsToReaddir = 0;
      t.mock.method(fsPromises, "readdir", async (...args: any[]) => {
        numberOfCallsToReaddir++;
        const dirPath = path.normalize(String(args[0]));

        if (dirPath === path.normalize(trustedFrom)) {
          return ["foo.ts"];
        }

        throw Object.assign(new Error(`Unexpected readdir: ${dirPath}`), {
          code: "EACCES",
        });
      });

      const resolver = new TrueCasePathResolver();

      // Resolving from a/B only readdirs a/B, trusting the casing of `from`.
      assert.equal(
        await resolver.getFileTrueCase(trustedFrom, "foo.ts"),
        "foo.ts",
      );
      assert.equal(numberOfCallsToReaddir, 1);
    });

    it("Should not throw when a previous call threw and the path now exists", async () => {
      const resolver = new TrueCasePathResolver();

      await assert.rejects(resolver.getFileTrueCase(tmp.path, "laterCreated"), {
        name: "FileNotFoundError",
      });

      await createFile(path.join(tmp.path, "laterCreated"));

      // The directory listing from the first call is cached, so without
      // `clear()` the new file is invisible.
      await assert.rejects(resolver.getFileTrueCase(tmp.path, "laterCreated"), {
        name: "FileNotFoundError",
      });

      resolver.clear();

      assert.equal(
        await resolver.getFileTrueCase(tmp.path, "laterCreated"),
        "laterCreated",
      );
    });

    it("Should throw FileNotFoundError when the case-folded name is ambiguous", async function () {
      // This test requires a case-sensitive filesystem in the tmp dir.
      // macOS APFS and Windows NTFS default to case-insensitive, so two
      // entries differing only in case can't coexist there.
      if (process.platform !== "linux") {
        return;
      }

      await createFile(path.join(tmp.path, "ambig"));
      await createFile(path.join(tmp.path, "AMBIG"));

      const resolver = new TrueCasePathResolver();

      // Exact matches still work.
      assert.equal(await resolver.getFileTrueCase(tmp.path, "ambig"), "ambig");
      assert.equal(await resolver.getFileTrueCase(tmp.path, "AMBIG"), "AMBIG");

      // A spelling that folds to the ambiguous key is rejected.
      await assert.rejects(resolver.getFileTrueCase(tmp.path, "Ambig"), {
        name: "FileNotFoundError",
      });
    });

    it("Should throw NotADirectoryError if an intermediate segment is not a directory", async () => {
      const filePath = path.join(tmp.path, "file");
      await createFile(filePath);

      const resolver = new TrueCasePathResolver();

      await assert.rejects(
        resolver.getFileTrueCase(tmp.path, path.join("file", "child.ts")),
        {
          name: "NotADirectoryError",
          message: `Path ${filePath} is not a directory`,
        },
      );
    });

    it("Should throw NotADirectoryError if the starting directory is not a directory", async () => {
      const filePath = path.join(tmp.path, "file");
      await createFile(filePath);

      const resolver = new TrueCasePathResolver();

      await assert.rejects(resolver.getFileTrueCase(filePath, "asd"), {
        name: "NotADirectoryError",
      });
    });

    it("Should throw FileNotFoundError when relativePath is '.' and the starting directory doesn't exist", async () => {
      const missingDir = path.join(tmp.path, "missing");

      const resolver = new TrueCasePathResolver();

      await assert.rejects(resolver.getFileTrueCase(missingDir, "."), {
        name: "FileNotFoundError",
      });
      await assert.rejects(resolver.getFileTrueCase(missingDir, ""), {
        name: "FileNotFoundError",
      });
    });

    it("Should throw NotADirectoryError when relativePath is '.' and the starting directory is a file", async () => {
      const filePath = path.join(tmp.path, "fileAsFrom");
      await createFile(filePath);

      const resolver = new TrueCasePathResolver();

      await assert.rejects(resolver.getFileTrueCase(filePath, "."), {
        name: "NotADirectoryError",
      });
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async () => {
      const linkPath = path.join(tmp.path, "link");
      await fsPromises.symlink(linkPath, linkPath);

      const resolver = new TrueCasePathResolver();

      await assert.rejects(resolver.getFileTrueCase(linkPath, "file"), {
        name: "FileSystemAccessError",
      });
    });
  });

  describe("isDirectory", () => {
    it("Should return true if the path is a directory", async () => {
      const dirPath = path.join(tmp.path, "dir");
      await mkdir(dirPath);

      assert.ok(
        await isDirectory(dirPath),
        "Should return true for a directory",
      );
    });

    it("Should return false if the path is not a directory", async () => {
      const filePath = path.join(tmp.path, "file");
      await createFile(filePath);

      assert.ok(
        !(await isDirectory(filePath)),
        "Should return false for a file",
      );
    });

    it("Should throw FileNotFoundError if the path doesn't exist", async () => {
      const actualPath = path.join(tmp.path, "not-exists");

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
      const filePath = path.join(tmp.path, "file.json");
      await writeUtf8File(filePath, JSON.stringify(expectedObject));

      assert.deepEqual(await readJsonFile(filePath), expectedObject);
      expectTypeOf(await readJsonFile(filePath)).toBeUnknown();
      expectTypeOf(
        await readJsonFile<{ a: number; b: number }>(filePath),
      ).toMatchTypeOf<{ a: number; b: number }>();
    });

    it("Should throw InvalidFileFormatError if the file is not valid JSON", async () => {
      const filePath = path.join(tmp.path, "file.json");
      await writeUtf8File(filePath, "not-json");

      await assert.rejects(readJsonFile(filePath), {
        name: "InvalidFileFormatError",
        message: `Invalid file format: ${filePath}`,
      });
    });

    it("Should throw FileNotFoundError if the file doesn't exist", async () => {
      const filePath = path.join(tmp.path, "not-exists.json");

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
      const filePath = path.join(tmp.path, "file.json");

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
      const filePath = path.join(tmp.path, "not-exists", "file.json");

      await writeJsonFile(filePath, expectedObject);

      assert.deepEqual(
        JSON.parse(await readUtf8File(filePath)),
        expectedObject,
      );
    });

    it("Should throw JsonSerializationError if the object can't be serialized to JSON", async () => {
      const filePath = path.join(tmp.path, "file.json");
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
      const filePath = path.join(tmp.path, "invalid\0filename.json");

      await assert.rejects(writeJsonFile(filePath, {}), {
        name: "FileSystemAccessError",
      });
    });
  });

  describe("readJsonFileAsStream", () => {
    it("Should read and parse a JSON file", async () => {
      const expectedObject = { a: 1, b: 2 };
      const filePath = path.join(tmp.path, "file.json");
      await writeUtf8File(filePath, JSON.stringify(expectedObject));

      assert.deepEqual(await readJsonFileAsStream(filePath), expectedObject);
      expectTypeOf(await readJsonFileAsStream(filePath)).toBeUnknown();
      expectTypeOf(
        await readJsonFileAsStream<{ a: number; b: number }>(filePath),
      ).toMatchTypeOf<{ a: number; b: number }>();
    });

    it("Should throw InvalidFileFormatError if the file is not valid JSON", async () => {
      const filePath = path.join(tmp.path, "file.json");
      await writeUtf8File(filePath, "not-json");

      await assert.rejects(readJsonFileAsStream(filePath), {
        name: "InvalidFileFormatError",
        message: `Invalid file format: ${filePath}`,
      });
    });

    it("Should throw InvalidFileFormatError if the file is empty", async () => {
      const filePath = path.join(tmp.path, "file.json");
      await writeUtf8File(filePath, "");

      await assert.rejects(readJsonFileAsStream(filePath), {
        name: "InvalidFileFormatError",
        message: `Invalid file format: ${filePath}`,
      });
    });

    it("Should throw FileNotFoundError if the file doesn't exist", async () => {
      const filePath = path.join(tmp.path, "not-exists.json");

      await assert.rejects(readJsonFileAsStream(filePath), {
        name: "FileNotFoundError",
        message: `File ${filePath} not found`,
      });
    });

    it("Should throw IsDirectoryError if the file is a directory", async () => {
      const filePath = path.join(tmp.path);

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
      const filePath = path.join(tmp.path, "file.json");

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
      const filePath = path.join(tmp.path, "not-exists", "file.json");

      await writeJsonFileAsStream(filePath, expectedObject);

      assert.deepEqual(
        JSON.parse(await readUtf8File(filePath)),
        expectedObject,
      );
    });

    it("Should throw JsonSerializationError if the object can't be serialized to JSON", async () => {
      const filePath = path.join(tmp.path, "file.json");
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
      const filePath = path.join(tmp.path, "invalid\0filename.json");

      await assert.rejects(writeJsonFileAsStream(filePath, {}), {
        name: "FileSystemAccessError",
      });
    });

    it("Should remove the part of the path that didn't exist before if an error is thrown", async () => {
      const dirPath = path.join(tmp.path, "not-exists");
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
      const filePath = path.join(tmp.path, "file.txt");
      await writeUtf8File(filePath, content);

      assert.equal(await readUtf8File(filePath), content);
      expectTypeOf(await readUtf8File(filePath)).toMatchTypeOf<string>();
    });

    it("Should throw IsDirectoryError if the path is a dir and not a file", async () => {
      const dirPath = path.join(tmp.path, "dir-name");
      await mkdir(dirPath);

      await assert.rejects(readUtf8File(dirPath), {
        name: "IsDirectoryError",
        message: `Path ${dirPath} is a directory`,
      });
    });

    it("Should throw FileNotFoundError if the file doesn't exist", async () => {
      const filePath = path.join(tmp.path, "not-exists.txt");

      await assert.rejects(readUtf8File(filePath), {
        name: "FileNotFoundError",
        message: `File ${filePath} not found`,
      });
    });

    it("Should throw IsDirectoryError if the path is a dir and not a file", async () => {
      const dirPath = path.join(tmp.path, "dir-name");
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
      const filePath = path.join(tmp.path, "file.txt");

      await writeUtf8File(filePath, content);

      assert.equal(await readUtf8File(filePath), content);
    });

    it("Should write a string to a file even if part of the path doesn't exist", async () => {
      const content = "hello";
      const filePath = path.join(tmp.path, "not-exists", "file.txt");

      await writeUtf8File(filePath, content);

      assert.equal(await readUtf8File(filePath), content);
    });

    it("Should allow setting the flag", async () => {
      const content = "hello";
      const filePath = path.join(tmp.path, "file.txt");

      await writeUtf8File(filePath, content);
      await writeUtf8File(filePath, content, "a");

      assert.equal(await readUtf8File(filePath), `${content}${content}`);
    });

    it("Should throw FileAlreadyExistsError if the file already exists and the flag 'x' is used", async () => {
      const filePath = path.join(tmp.path, "file.txt");
      await writeUtf8File(filePath, "hello");

      await assert.rejects(writeUtf8File(filePath, "hello", "wx"), {
        name: "FileAlreadyExistsError",
        message: `File ${filePath} already exists`,
      });
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async () => {
      // Use a path that will cause a file system error (invalid characters in filename)
      const filePath = path.join(tmp.path, "invalid\0filename.txt");

      await assert.rejects(writeUtf8File(filePath, "hello"), {
        name: "FileSystemAccessError",
      });
    });
  });

  describe("readBinaryFile", () => {
    it("Should read a file and return its content as a string", async () => {
      const content = "hello";
      const filePath = path.join(tmp.path, "file.txt");

      await writeUtf8File(filePath, content);

      const encoder = new TextEncoder();
      const binaryContent = encoder.encode(content);

      assert.deepEqual(await readBinaryFile(filePath), binaryContent);
      expectTypeOf(await readBinaryFile(filePath)).toMatchTypeOf<Uint8Array>();
    });

    it("Should throw IsDirectoryError if the path is a dir and not a file", async () => {
      const dirPath = path.join(tmp.path, "dir-name");

      await mkdir(dirPath);

      await assert.rejects(readBinaryFile(dirPath), {
        name: "IsDirectoryError",
        message: `Path ${dirPath} is a directory`,
      });
    });

    it("Should throw FileNotFoundError if the file doesn't exist", async () => {
      const filePath = path.join(tmp.path, "not-exists.txt");

      await assert.rejects(readBinaryFile(filePath), {
        name: "FileNotFoundError",
        message: `File ${filePath} not found`,
      });
    });

    it("Should throw IsDirectoryError if the path is a dir and not a file", async () => {
      const dirPath = path.join(tmp.path, "dir-name");

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
      const dirPath = path.join(tmp.path, "dir");
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
      const dirPath = path.join(tmp.path, "not-exists");

      await assert.rejects(readdir(dirPath), {
        name: "FileNotFoundError",
        message: `File ${dirPath} not found`,
      });
    });

    it("Should throw NotADirectoryError if the path is not a directory", async () => {
      const filePath = path.join(tmp.path, "file");
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

  describe("readdirOrEmpty", () => {
    it("Should return the files in a directory", async () => {
      const dirPath = path.join(tmp.path, "dir");
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
        new Set(await readdirOrEmpty(dirPath)),
        new Set(["file1.txt", "file2.txt", "file3.json", "subdir"]),
      );
    });

    it("Should return an empty array if the directory doesn't exist", async () => {
      const dirPath = path.join(tmp.path, "not-exists");

      assert.deepEqual(await readdirOrEmpty(dirPath), []);
    });

    it("Should throw NotADirectoryError if the path is not a directory", async () => {
      const filePath = path.join(tmp.path, "file");
      await createFile(filePath);

      await assert.rejects(readdirOrEmpty(filePath), {
        name: "NotADirectoryError",
        message: `Path ${filePath} is not a directory`,
      });
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async () => {
      const invalidPath = "\0";

      await assert.rejects(readdirOrEmpty(invalidPath), {
        name: "FileSystemAccessError",
      });
    });
  });

  describe("mkdir", () => {
    it("Should create a directory", async () => {
      const dirPath = path.join(tmp.path, "dir");

      await mkdir(dirPath);

      assert.ok(await isDirectory(dirPath), "Should create a directory");
    });

    it("Should create a directory and any necessary directories along the way", async () => {
      const dirPath = path.join(tmp.path, "dir", "subdir");

      await mkdir(dirPath);

      assert.ok(await isDirectory(dirPath), "Should create a directory");
    });

    it("Should do nothing if the directory already exists", async () => {
      const dirPath = path.join(tmp.path, "dir");

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
      const filePath = path.join(tmp.path, "file.txt");
      await createFile(filePath);

      const stats = await fsPromises.stat(filePath);

      assert.equal(
        stats.ctime.getTime(),
        (await getChangeTime(filePath)).getTime(),
      );
    });

    it("Should throw FileNotFoundError if the file doesn't exist", async () => {
      const filePath = path.join(tmp.path, "not-exists.txt");

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
      const filePath = path.join(tmp.path, "file.txt");
      await createFile(filePath);

      const stats = await fsPromises.stat(filePath);

      assert.equal(
        stats.atime.getTime(),
        (await getAccessTime(filePath)).getTime(),
      );
    });

    it("Should throw FileNotFoundError if the file doesn't exist", async () => {
      const filePath = path.join(tmp.path, "not-exists.txt");

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
      const filePath = path.join(tmp.path, "file.txt");
      await createFile(filePath);

      const stats = await fsPromises.stat(filePath);

      assert.equal(stats.size, await getFileSize(filePath));
    });

    it("Should throw FileNotFoundError if the file doesn't exist", async () => {
      const filePath = path.join(tmp.path, "not-exists.txt");

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
      const filePath = path.join(tmp.path, "file.txt");
      await createFile(filePath);

      assert.ok(
        await exists(filePath),
        "Should return true for an existing file",
      );
    });

    it("Should return false if the file doesn't exist", async () => {
      const filePath = path.join(tmp.path, "not-exists.txt");

      assert.ok(
        !(await exists(filePath)),
        "Should return false for a non-existing file",
      );
    });
  });

  describe("copy", () => {
    it("Should copy a file", async () => {
      const srcPath = path.join(tmp.path, "src.txt");
      const destPath = path.join(tmp.path, "dest.txt");

      await writeUtf8File(srcPath, "hello");
      await copy(srcPath, destPath);

      assert.equal(await readUtf8File(destPath), "hello");
    });

    it("Should throw FileNotFoundError if the source file doesn't exist", async () => {
      const srcPath = path.join(tmp.path, "not-exists.txt");
      const destPath = path.join(tmp.path, "dest.txt");

      await assert.rejects(copy(srcPath, destPath), {
        name: "FileNotFoundError",
        message: `File ${srcPath} not found`,
      });
    });

    it("Should throw FileNotFoundError if the destination path doesn't exist", async () => {
      const srcPath = path.join(tmp.path, "src.txt");
      const destPath = path.join(tmp.path, "not-exists", "dest.txt");

      await createFile(srcPath);

      await assert.rejects(copy(srcPath, destPath), {
        name: "FileNotFoundError",
        message: `File ${destPath} not found`,
      });
    });

    it("Should throw IsDirectoryError if the source path is a directory", async () => {
      const srcPath = path.join(tmp.path, "dir");
      const destPath = path.join(tmp.path, "dest.txt");

      await mkdir(srcPath);

      await assert.rejects(copy(srcPath, destPath), {
        name: "IsDirectoryError",
        message: `Path ${srcPath} is a directory`,
      });
    });

    it("Should throw IsDirectoryError if the destination path is a directory", async () => {
      const srcPath = path.join(tmp.path, "src.txt");
      const destPath = path.join(tmp.path, "dir");

      await createFile(srcPath);
      await mkdir(destPath);

      await assert.rejects(copy(srcPath, destPath), {
        name: "IsDirectoryError",
        message: `Path ${destPath} is a directory`,
      });
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async () => {
      const invalidPath = "\0";
      const destPath = path.join(tmp.path, "dest.txt");

      await assert.rejects(copy(invalidPath, destPath), {
        name: "FileSystemAccessError",
      });
    });
  });

  describe("remove", () => {
    it("Should remove a file", async () => {
      const filePath = path.join(tmp.path, "file.txt");
      await createFile(filePath);

      await remove(filePath);

      assert.ok(!(await exists(filePath)), "Should remove a file");
    });

    it("Should remove an empty directory", async () => {
      const dirPath = path.join(tmp.path, "dir");
      await mkdir(dirPath);

      await remove(dirPath);

      assert.ok(!(await exists(dirPath)), "Should remove a directory");
    });

    it("Should remove a directory and its content", async () => {
      const dirPath = path.join(tmp.path, "dir");
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
      const filePath = path.join(tmp.path, "not-exists.txt");

      await remove(filePath);
    });

    it("Should throw FileSystemAccessError for any error", async () => {
      const invalidPath = "\0";

      await assert.rejects(remove(invalidPath), {
        name: "FileSystemAccessError",
      });
    });

    it("Should throw busy error on windows platform", async () => {
      const dirPath = path.join(tmp.path, "lockTest");
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
      const filePath = path.join(tmp.path, "file.txt");
      await createFile(filePath);

      await chmod(filePath, 0o666);

      const stats = await fsPromises.stat(filePath);

      // eslint-disable-next-line no-bitwise -- Bitwise is common in fs permissions
      assert.equal(stats.mode & 0o777, 0o666);
    });

    it("Should throw FileNotFoundError if the file doesn't exist", async () => {
      const filePath = path.join(tmp.path, "not-exists.txt");

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
      const srcPath = path.join(tmp.path, "src.txt");
      const destPath = path.join(tmp.path, "dest.txt");

      await writeUtf8File(srcPath, "hello");
      await move(srcPath, destPath);

      assert.equal(await readUtf8File(destPath), "hello");
      assert.ok(!(await exists(srcPath)), "Should remove the source file");
    });

    it("Should move a directory", async () => {
      const srcPath = path.join(tmp.path, "dir");
      const destPath = path.join(tmp.path, "dest");

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
      const srcPath = path.join(tmp.path, "not-exists.txt");
      const destPath = path.join(tmp.path, "dest.txt");

      await assert.rejects(move(srcPath, destPath), {
        name: "FileNotFoundError",
        message: `File ${srcPath} not found`,
      });
    });

    it("Should throw FileNotFoundError if the destination path doesn't exist", async () => {
      const srcPath = path.join(tmp.path, "src.txt");
      const destPath = path.join(tmp.path, "not-exists", "dest.txt");

      await createFile(srcPath);

      await assert.rejects(move(srcPath, destPath), {
        name: "FileNotFoundError",
        message: `File ${destPath} not found`,
      });
    });

    it("Should throw DirectoryNotEmptyError if the source path is a directory and the destination path is a directory that is not empty", async () => {
      const srcPath = path.join(tmp.path, "dir");
      const destPath = path.join(tmp.path, "dest");

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
      const destPath = path.join(tmp.path, "dest.txt");

      await assert.rejects(move(invalidPath, destPath), {
        name: "FileSystemAccessError",
      });
    });
  });

  describe("symlink", { skip: process.platform === "win32" }, () => {
    it("Should create a symlink to an existing file", async () => {
      const targetPath = path.join(tmp.path, "target.txt");
      const linkPath = path.join(tmp.path, "link.txt");

      await writeUtf8File(targetPath, "hello");
      await symlink(targetPath, linkPath);

      const stats = await fsPromises.lstat(linkPath);
      assert.ok(stats.isSymbolicLink(), "Should create a symlink");
      assert.equal(await fsPromises.readlink(linkPath), targetPath);
      assert.equal(await readUtf8File(linkPath), "hello");
    });

    it("Should create a symlink to an existing directory", async () => {
      const targetPath = path.join(tmp.path, "target-dir");
      const linkPath = path.join(tmp.path, "link-dir");

      await mkdir(targetPath);
      await createFile(path.join(targetPath, "inside.txt"));
      await symlink(targetPath, linkPath);

      const stats = await fsPromises.lstat(linkPath);
      assert.ok(stats.isSymbolicLink(), "Should create a symlink");
      assert.equal(await fsPromises.readlink(linkPath), targetPath);
      assert.ok(
        await exists(path.join(linkPath, "inside.txt")),
        "Should traverse through the symlink to the directory's contents",
      );
    });

    it("Should store the target verbatim when given a relative path", async () => {
      const linkPath = path.join(tmp.path, "link.txt");

      // Create the target next to the link so the relative reference resolves.
      await writeUtf8File(path.join(tmp.path, "target.txt"), "hello");
      await symlink("target.txt", linkPath);

      assert.equal(await fsPromises.readlink(linkPath), "target.txt");
      assert.equal(await readUtf8File(linkPath), "hello");
    });

    it("Should create a dangling symlink when the target doesn't exist", async () => {
      const targetPath = path.join(tmp.path, "missing.txt");
      const linkPath = path.join(tmp.path, "link.txt");

      await symlink(targetPath, linkPath);

      const stats = await fsPromises.lstat(linkPath);
      assert.ok(stats.isSymbolicLink(), "Should create a symlink");
      assert.ok(
        !(await exists(linkPath)),
        "exists() follows the symlink, so it should be false for a dangling link",
      );
    });

    it("Should throw FileNotFoundError if the parent directory of linkPath doesn't exist", async () => {
      const targetPath = path.join(tmp.path, "target.txt");
      const linkPath = path.join(tmp.path, "missing-dir", "link.txt");

      await writeUtf8File(targetPath, "hello");

      await assert.rejects(symlink(targetPath, linkPath), {
        name: "FileNotFoundError",
        message: `File ${linkPath} not found`,
      });
    });

    it("Should throw FileAlreadyExistsError if linkPath already exists as a file", async () => {
      const targetPath = path.join(tmp.path, "target.txt");
      const linkPath = path.join(tmp.path, "link.txt");

      await writeUtf8File(targetPath, "hello");
      await createFile(linkPath);

      await assert.rejects(symlink(targetPath, linkPath), {
        name: "FileAlreadyExistsError",
        message: `File ${linkPath} already exists`,
      });
    });

    it("Should throw FileAlreadyExistsError if linkPath already exists as a symlink", async () => {
      const targetPath = path.join(tmp.path, "target.txt");
      const linkPath = path.join(tmp.path, "link.txt");

      await writeUtf8File(targetPath, "hello");
      await fsPromises.symlink(targetPath, linkPath);

      await assert.rejects(symlink(targetPath, linkPath), {
        name: "FileAlreadyExistsError",
        message: `File ${linkPath} already exists`,
      });
    });

    it("Should throw FileSystemAccessError if a different error is thrown", async () => {
      const targetPath = path.join(tmp.path, "target.txt");
      const invalidLinkPath = "\0";

      await assert.rejects(symlink(targetPath, invalidLinkPath), {
        name: "FileSystemAccessError",
      });
    });
  });

  describe("createFile", () => {
    it("Should create a file", async () => {
      const filePath = path.join(tmp.path, "file.txt");

      await createFile(filePath);

      assert.ok(await exists(filePath), "Should create a file");
    });

    it("Should create a file even if part of the path doesn't exist", async () => {
      const filePath = path.join(tmp.path, "not-exists", "file.txt");

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
      const dirPath = path.join(tmp.path, "dir");
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
      const dirPath = path.join(tmp.path, "dir");
      await mkdir(dirPath);
      await chmod(dirPath, 0o666);

      await emptyDir(dirPath);

      // eslint-disable-next-line no-bitwise -- Bitwise is common in fs permissions
      assert.equal((await fsPromises.stat(dirPath)).mode & 0o777, 0o666);
    });

    it("Should create the directory if it doesn't exist", async () => {
      const dirPath = path.join(tmp.path, "not-exists");

      await emptyDir(dirPath);

      assert.ok(await isDirectory(dirPath), "Should create the directory");
      assert.deepEqual(await readdir(dirPath), []);
    });

    it("Should throw NotADirectoryError if the path is not a directory", async () => {
      const filePath = path.join(tmp.path, "file");
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
      const filePath = path.join(tmp.path, "file.txt");
      await createFile(filePath);

      assert.equal(await findUp("file.txt", tmp.path), filePath);
    });

    it("Should find a file in a parent directory", async () => {
      const filePath = path.join(tmp.path, "file.txt");
      await createFile(filePath);

      assert.equal(
        await findUp("file.txt", path.join(tmp.path, "subdir")),
        filePath,
      );
    });

    it("Should return undefined if the file is not found", async () => {
      assert.equal(await findUp("not-exists.txt"), undefined);
    });
  });
});
