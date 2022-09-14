import { assert } from "chai";
import path from "path";
import semver from "semver";

import { SUPPORTED_SOLIDITY_VERSION_RANGE } from "../../src/internal/hardhat-network/stack-traces/constants";
import { useEnvironment } from "../helpers/environment";

describe("sample projects solidity versions", function () {
  describe("javascript sample project", function () {
    useEnvironment(
      path.resolve(
        __dirname,
        "..",
        "..",
        "sample-projects",
        "javascript",
        "hardhat.config.js"
      )
    );

    it("should use the latest supported version", async function () {
      const solidityVersion = this.env.userConfig.solidity;

      if (typeof solidityVersion !== "string") {
        assert.fail("solidity version should ve a string");
      }

      const nextPatch = semver.inc(solidityVersion, "patch");
      const nextMinor = semver.inc(solidityVersion, "minor");
      const nextMajor = semver.inc(solidityVersion, "major");

      if (nextPatch === null || nextMinor === null || nextMajor === null) {
        assert.fail("shouldn't happen");
      }

      assert.isFalse(
        semver.satisfies(nextPatch, SUPPORTED_SOLIDITY_VERSION_RANGE)
      );
      assert.isFalse(
        semver.satisfies(nextMinor, SUPPORTED_SOLIDITY_VERSION_RANGE)
      );
      assert.isFalse(
        semver.satisfies(nextMajor, SUPPORTED_SOLIDITY_VERSION_RANGE)
      );
    });
  });

  describe("typescript sample project", function () {
    useEnvironment(
      path.resolve(
        __dirname,
        "..",
        "..",
        "sample-projects",
        "typescript",
        "hardhat.config.ts"
      )
    );

    it("should use the latest supported version", async function () {
      const solidityVersion = this.env.userConfig.solidity;

      if (typeof solidityVersion !== "string") {
        assert.fail("solidity version should ve a string");
      }

      const nextPatch = semver.inc(solidityVersion, "patch");
      const nextMinor = semver.inc(solidityVersion, "minor");
      const nextMajor = semver.inc(solidityVersion, "major");

      if (nextPatch === null || nextMinor === null || nextMajor === null) {
        assert.fail("shouldn't happen");
      }

      assert.isFalse(
        semver.satisfies(nextPatch, SUPPORTED_SOLIDITY_VERSION_RANGE)
      );
      assert.isFalse(
        semver.satisfies(nextMinor, SUPPORTED_SOLIDITY_VERSION_RANGE)
      );
      assert.isFalse(
        semver.satisfies(nextMajor, SUPPORTED_SOLIDITY_VERSION_RANGE)
      );
    });
  });
});
