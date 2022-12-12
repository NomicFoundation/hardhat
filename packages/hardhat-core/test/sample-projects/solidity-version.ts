import { assert } from "chai";
import fs from "fs";
import path from "path";
import semver from "semver";

import { EMPTY_HARDHAT_CONFIG } from "../../src/internal/cli/project-creation";
import { SUPPORTED_SOLIDITY_VERSION_RANGE } from "../../src/internal/hardhat-network/stack-traces/constants";

describe("sample projects solidity versions", function () {
  describe("empty hardhat config", function () {
    it("should use the latest supported version", async function () {
      const configContent = EMPTY_HARDHAT_CONFIG;

      const solidityVersion = configContent.match(/solidity: "(.*)"/)![1];

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

  describe("javascript sample project", function () {
    it("should use the latest supported version", async function () {
      const pathToConfig = path.resolve(
        __dirname,
        "..",
        "..",
        "sample-projects",
        "javascript",
        "hardhat.config.js"
      );

      const configContent = fs.readFileSync(pathToConfig).toString();

      const solidityVersion = configContent.match(/solidity: "(.*)"/)![1];

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
    it("should use the latest supported version", async function () {
      const pathToConfig = path.resolve(
        __dirname,
        "..",
        "..",
        "sample-projects",
        "typescript",
        "hardhat.config.ts"
      );

      const configContent = fs.readFileSync(pathToConfig).toString();

      const solidityVersion = configContent.match(/solidity: "(.*)"/)![1];

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
