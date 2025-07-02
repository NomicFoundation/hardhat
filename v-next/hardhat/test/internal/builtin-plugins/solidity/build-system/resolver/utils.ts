import type { ResolvedNpmPackage } from "../../../../../../src/types/solidity.js";

import assert from "node:assert/strict";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import {
  mkdtemp,
  remove,
  writeUtf8File,
} from "@nomicfoundation/hardhat-utils/fs";

import {
  PathValidationErrorType,
  resolveSubpathWithPackageExports,
  validateFsPath,
} from "../../../../../../src/internal/builtin-plugins/solidity/build-system/resolver/utils.js";

describe("Resolver utils", () => {
  describe("validateFsPath", () => {
    let dir: string;
    before(async () => {
      dir = await mkdtemp("hardhat-test-validate-fs-path");
    });

    after(async () => {
      await remove(dir);
    });

    it("Should return an error if the path doesn't exist", async () => {
      const relativePath = "nope";

      assert.deepEqual(await validateFsPath(dir, relativePath), {
        success: false,
        error: {
          type: PathValidationErrorType.DOES_NOT_EXIST,
        },
      });
    });

    it("Should return an error if the path exists with a different casing", async () => {
      const relativePathIncorrect = "FILE.txt";
      const relativePathCorrect = "file.txt";
      const absolutePath = path.join(dir, relativePathCorrect);
      await writeUtf8File(absolutePath, "txt");

      assert.deepEqual(await validateFsPath(dir, relativePathIncorrect), {
        success: false,
        error: {
          type: PathValidationErrorType.CASING_ERROR,
          correctCasing: relativePathCorrect,
        },
      });
    });

    it("Should return success if the path exists with the correct casing", async () => {
      const relativePath = "FILE2.txt";
      const absolutePath = path.join(dir, relativePath);
      await writeUtf8File(absolutePath, "txt");

      assert.deepEqual(await validateFsPath(dir, relativePath), {
        success: true,
        value: undefined,
      });
    });
  });

  describe("resolveSubpathWithPackageExports", () => {
    const npmPackage: Required<ResolvedNpmPackage> = {
      name: "foo",
      version: "1.2.3",
      rootFsPath: "root",
      inputSourceNameRoot: "root",
      exports: {
        "./*.sol": "./src/*.sol",
      },
    };

    it("Should return the the resolved path", () => {
      assert.deepEqual(resolveSubpathWithPackageExports(npmPackage, "A.sol"), {
        success: true,
        value: "src/A.sol",
      });

      assert.deepEqual(
        resolveSubpathWithPackageExports(npmPackage, "./B.sol"),
        {
          success: true,
          value: "src/B.sol",
        },
      );
    });

    it("Should return undefined if the path is not exported", () => {
      assert.deepEqual(resolveSubpathWithPackageExports(npmPackage, "A.txt"), {
        success: false,
        error: undefined,
      });
    });
  });
});
