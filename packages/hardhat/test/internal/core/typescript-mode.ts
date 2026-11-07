import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { getTypeScriptMode } from "../../../src/internal/core/typescript-mode.js";

const PACKAGE_JSON_PATH = "/project/package.json";

function packageJsonWithHardhatField(hardhat: unknown) {
  const packageJson = { name: "project", version: "1.0.0", hardhat };
  return packageJson;
}

describe("getTypeScriptMode", () => {
  it(`should return "tsx" when there's no hardhat field`, () => {
    assert.equal(
      getTypeScriptMode(
        { name: "project", version: "1.0.0" },
        PACKAGE_JSON_PATH,
      ),
      "tsx",
    );
  });

  it(`should return "tsx" when the hardhat field has no typescript setting`, () => {
    assert.equal(
      getTypeScriptMode(packageJsonWithHardhatField({}), PACKAGE_JSON_PATH),
      "tsx",
    );
  });

  for (const mode of ["node", "tsx"] as const) {
    it(`should return "${mode}" when it's set`, () => {
      assert.equal(
        getTypeScriptMode(
          packageJsonWithHardhatField({ typescript: mode }),
          PACKAGE_JSON_PATH,
        ),
        mode,
      );
    });
  }

  for (const [description, hardhat, shownHardhat] of [
    ["a string", "node", `"node"`],
    ["null", null, "null"],
    ["an array", ["node"], `["node"]`],
  ] as const) {
    it(`should throw if the hardhat field is ${description}`, () => {
      assertThrowsHardhatError(
        () =>
          getTypeScriptMode(
            packageJsonWithHardhatField(hardhat),
            PACKAGE_JSON_PATH,
          ),
        HardhatError.ERRORS.CORE.GENERAL.INVALID_PACKAGE_JSON_HARDHAT_SETTINGS,
        {
          packageJsonPath: PACKAGE_JSON_PATH,
          reason: `it must be an object, but it's ${shownHardhat}`,
        },
      );
    });
  }

  it("should throw if the hardhat field has an unknown setting", () => {
    assertThrowsHardhatError(
      () =>
        getTypeScriptMode(
          packageJsonWithHardhatField({ typescript: "node", foo: 1 }),
          PACKAGE_JSON_PATH,
        ),
      HardhatError.ERRORS.CORE.GENERAL.INVALID_PACKAGE_JSON_HARDHAT_SETTINGS,
      {
        packageJsonPath: PACKAGE_JSON_PATH,
        reason: `unknown setting "foo". The supported settings are: "typescript"`,
      },
    );
  });

  for (const [description, value, shownValue] of [
    ["an unknown mode", "deno", `"deno"`],
    ["a non-string", 1, "1"],
    ["a boolean", false, "false"],
  ] as const) {
    it(`should throw if typescript is ${description}`, () => {
      assertThrowsHardhatError(
        () =>
          getTypeScriptMode(
            packageJsonWithHardhatField({ typescript: value }),
            PACKAGE_JSON_PATH,
          ),
        HardhatError.ERRORS.CORE.GENERAL.INVALID_PACKAGE_JSON_HARDHAT_SETTINGS,
        {
          packageJsonPath: PACKAGE_JSON_PATH,
          reason: `the "typescript" setting must be "node" or "tsx", but it's ${shownValue}`,
        },
      );
    });
  }
});
