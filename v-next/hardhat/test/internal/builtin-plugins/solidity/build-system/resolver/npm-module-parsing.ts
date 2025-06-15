import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getNpmPackageName,
  parseNpmDirectImport,
} from "../../../../../../src/internal/builtin-plugins/solidity/build-system/resolver/npm-module-parsing.js";

describe("Npm module parsing", () => {
  describe("getNpmPackageName", () => {
    it("Should return the package name of an npm module prefix", () => {
      assert.equal(
        getNpmPackageName("@openzeppelin/contracts"),
        "@openzeppelin/contracts",
      );

      assert.equal(
        getNpmPackageName("@openzeppelin/contracts/"),
        "@openzeppelin/contracts",
      );

      assert.equal(
        getNpmPackageName("@openzeppelin/contracts/a"),
        "@openzeppelin/contracts",
      );

      assert.equal(
        getNpmPackageName("@openzeppelin/contracts/a/"),
        "@openzeppelin/contracts",
      );

      assert.equal(getNpmPackageName("foo"), "foo");

      assert.equal(getNpmPackageName("foo/contracts"), "foo");

      assert.equal(getNpmPackageName("foo/contracts/"), "foo");

      assert.equal(getNpmPackageName("foo/contracts/a"), "foo");

      assert.equal(getNpmPackageName("foo/contracts/a/"), "foo");

      assert.equal(getNpmPackageName("123"), "123");
    });

    it("should return undefined if the input is invalid", () => {
      assert.equal(getNpmPackageName(""), undefined);
      assert.equal(getNpmPackageName("@"), undefined);
      assert.equal(getNpmPackageName("@/"), undefined);
      assert.equal(getNpmPackageName("@a"), undefined);
      assert.equal(getNpmPackageName("@a/"), undefined);
      assert.equal(getNpmPackageName("-As"), undefined);
    });
  });

  describe("parseNpmDirectImport", () => {
    it("Should parse a valid direct import", () => {
      assert.deepEqual(parseNpmDirectImport("a/b/c"), {
        package: "a",
        subpath: "b/c",
      });

      assert.deepEqual(parseNpmDirectImport("@scope/package/a/b/c"), {
        package: "@scope/package",
        subpath: "a/b/c",
      });
    });

    it("Should return undefined if the input is invalid", () => {
      assert.equal(parseNpmDirectImport(""), undefined);
      assert.equal(parseNpmDirectImport("a"), undefined);
      assert.equal(parseNpmDirectImport("a/"), undefined);
      assert.equal(parseNpmDirectImport("!a/b/c/"), undefined);
      assert.equal(parseNpmDirectImport("@scope/package"), undefined);
    });
  });
});
