import { assert } from "chai";
import path from 'node:path';

import { ERRORS } from "../../src/internal/core/errors-list";
import {
  isAbsolutePathSourceName,
  isLocalSourceName,
  localPathToSourceName,
  localSourceNameToPath,
  normalizeSourceName,
  replaceBackslashes,
  validateSourceNameExistenceAndCasing,
  validateSourceNameFormat,
} from "../../src/utils/source-names";
import { expectHardhatError, expectHardhatErrorAsync } from "../helpers/errors";

describe("Source names utilities", function () {
  describe("validateSourceNameFormat", function () {
    it("Should fail with absolute paths", async function () {
      expectHardhatError(
        () => validateSourceNameFormat(normalizeSourceName(__dirname)),
        ERRORS.SOURCE_NAMES.INVALID_SOURCE_NAME_ABSOLUTE_PATH
      );
    });

    it("Should fail with slash-based absolute paths, even on windows", async function () {
      expectHardhatError(
        () => validateSourceNameFormat("/asd"),
        ERRORS.SOURCE_NAMES.INVALID_SOURCE_NAME_ABSOLUTE_PATH
      );
    });

    it("Should fail if it is a relative path", async function () {
      expectHardhatError(
        () => validateSourceNameFormat("./asd"),
        ERRORS.SOURCE_NAMES.INVALID_SOURCE_NAME_RELATIVE_PATH
      );

      expectHardhatError(
        () => validateSourceNameFormat("../asd"),
        ERRORS.SOURCE_NAMES.INVALID_SOURCE_NAME_RELATIVE_PATH
      );
    });

    it("Shouldn't fail if it is a dotfile", async function () {
      validateSourceNameFormat(".asd");
    });

    it("Shouldn't fail if it is a special dotfile", async function () {
      validateSourceNameFormat("..asd/");
    });

    it("Should fail if it uses backslash", async function () {
      expectHardhatError(
        () => validateSourceNameFormat("asd\\sd"),
        ERRORS.SOURCE_NAMES.INVALID_SOURCE_NAME_BACKSLASHES
      );
    });

    it("Should fail if is not normalized", async function () {
      expectHardhatError(
        () => validateSourceNameFormat("asd/./asd"),
        ERRORS.SOURCE_NAMES.INVALID_SOURCE_NOT_NORMALIZED
      );

      expectHardhatError(
        () => validateSourceNameFormat("asd/../asd"),
        ERRORS.SOURCE_NAMES.INVALID_SOURCE_NOT_NORMALIZED
      );

      expectHardhatError(
        () => validateSourceNameFormat("asd//asd"),
        ERRORS.SOURCE_NAMES.INVALID_SOURCE_NOT_NORMALIZED
      );
    });
  });

  describe("isLocalSourceName", function () {
    it("Should return false if it includes node_modules", async function () {
      assert.isFalse(await isLocalSourceName(__dirname, "asd/node_modules"));
    });

    it("Should return true if the first part/dir of the source name exists", async function () {
      assert.isTrue(
        await isLocalSourceName(path.dirname(__dirname), "utils/asd")
      );

      assert.isTrue(await isLocalSourceName(path.dirname(__dirname), "utils"));
    });

    it("Should return true if the first part/dir of the source name exists with a different casing", async function () {
      assert.isTrue(
        await isLocalSourceName(path.dirname(__dirname), "utilS/asd")
      );

      assert.isTrue(await isLocalSourceName(path.dirname(__dirname), "uTils"));
    });

    it("Should return false if the first part/dir of the source name doesn't exist", async function () {
      assert.isFalse(
        await isLocalSourceName(path.dirname(__dirname), "no/asd")
      );
    });

    // This is a regression test for this issue: https://github.com/nomiclabs/hardhat/issues/998
    it("Should return false if the source name is 'hardhat/console.sol'", async function () {
      const projectPath = path.join(
        path.dirname(__dirname),
        "fixture-projects",
        "project-with-hardhat-directory"
      );
      assert.isFalse(
        await isLocalSourceName(projectPath, "hardhat/console.sol")
      );
    });
  });

  describe("validateSourceNameExistenceAndCasing", function () {
    it("Should throw if the file doesn't exist", async function () {
      await expectHardhatErrorAsync(
        () => validateSourceNameExistenceAndCasing(__dirname, `asd`),
        ERRORS.SOURCE_NAMES.FILE_NOT_FOUND
      );
    });

    it("Should throw if the casing is incorrect", async function () {
      await expectHardhatErrorAsync(
        () =>
          validateSourceNameExistenceAndCasing(__dirname, `source-Names.ts`),
        ERRORS.SOURCE_NAMES.WRONG_CASING
      );
    });
  });

  describe("localPathToSourceName", function () {
    it("Shouldn't accept files outside the project", async function () {
      await expectHardhatErrorAsync(
        () =>
          localPathToSourceName(
            __dirname,
            path.normalize(`${__dirname}/../asd`)
          ),
        ERRORS.SOURCE_NAMES.EXTERNAL_AS_LOCAL
      );
    });

    it("Shouldn't accept files from node_modules", async function () {
      await expectHardhatErrorAsync(
        () => localPathToSourceName(__dirname, `${__dirname}/node_modules/asd`),
        ERRORS.SOURCE_NAMES.NODE_MODULES_AS_LOCAL
      );
    });

    it("Should throw if the file doesn't exist", async function () {
      await expectHardhatErrorAsync(
        () => localPathToSourceName(__dirname, `${__dirname}/asd`),
        ERRORS.SOURCE_NAMES.FILE_NOT_FOUND
      );
    });

    it("Should return the right casing of a file", async function () {
      assert.equal(
        await localPathToSourceName(__dirname, `${__dirname}/source-NAMES.ts`),
        "source-names.ts"
      );
    });
  });

  describe("localSourceNameToPath", function () {
    it("Should join the project root and the source name", function () {
      assert.equal(
        localSourceNameToPath(__dirname, "asd/qwe"),
        path.join(__dirname, "asd/qwe")
      );
    });
  });

  describe("normalizeSourceName", function () {
    it("Should remove /./", function () {
      assert.equal(normalizeSourceName("asd/./asd"), "asd/asd");
    });

    it("Should remove /../", function () {
      assert.equal(normalizeSourceName("asd/a/../asd"), "asd/asd");
    });

    it("Should simplify //", function () {
      assert.equal(normalizeSourceName("asd//asd"), "asd/asd");
    });

    it("Should use slashes and not backslashes", function () {
      assert.equal(normalizeSourceName("asd\\asd"), "asd/asd");
    });
  });

  describe("isAbsolutePathSourceName", function () {
    it("Should return false for relative paths", function () {
      assert.isFalse(isAbsolutePathSourceName("./asd"));
      assert.isFalse(isAbsolutePathSourceName("asd"));
    });

    it("Should return true for absolute paths", function () {
      assert.isTrue(isAbsolutePathSourceName(__filename));
    });

    it("Should return true for paths starting in /", function () {
      assert.isTrue(isAbsolutePathSourceName("/asd"));
    });
  });

  describe("replaceBackslashes", function () {
    it("Should return the same string with / instead of \\", function () {
      assert.equal(replaceBackslashes("\\a"), "/a");
      assert.equal(replaceBackslashes("\\\\a"), "//a");
      assert.equal(replaceBackslashes("/\\\\a"), "///a");
    });
  });
});
