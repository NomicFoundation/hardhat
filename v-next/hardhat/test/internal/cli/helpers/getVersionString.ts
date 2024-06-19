import assert from "node:assert/strict";
import { describe, it } from "node:test";

import packageJson from "../../../../package.json";
import { getVersionString } from "../../../../src/internal/cli/helpers/getVersionString.js";

describe("getVersionString", function () {
  it("should return the version string", function () {
    const versionString = getVersionString();

    assert.equal(versionString, `Hardhat version ${packageJson.version}`);
  });
});
