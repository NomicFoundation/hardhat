import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import {
  fsPathToSourceNamePath,
  sourceNamePathJoin,
  sourceNamePathToFsPath,
} from "../../../../../../src/internal/builtin-plugins/solidity/build-system/resolver/source-name-utils.js";

describe("Source name utils", () => {
  describe("fsPathToSourceNamePath", () => {
    it("Should convert a path to a source name", () => {
      assert.equal(fsPathToSourceNamePath(path.join("a", "b", "c")), "a/b/c");
    });
  });

  describe("sourceNamePathToFsPath", () => {
    it("Should convert a source name to a path", () => {
      assert.equal(sourceNamePathToFsPath("a/b/c"), path.join("a", "b", "c"));
    });
  });

  describe("sourceNamePathJoin", () => {
    it("Should join two source names with a slash", () => {
      assert.equal(sourceNamePathJoin("a", "b"), "a/b");
    });

    it("Should preserve trailing slashes", () => {
      assert.equal(sourceNamePathJoin("a", "b/"), "a/b/");
    });

    it("Should collapse multiple slashes", () => {
      assert.equal(sourceNamePathJoin("a////", "b/"), "a/b/");
    });

    it("Should ignore empty path fragments", () => {
      assert.equal(sourceNamePathJoin("a/", "", "b/"), "a/b/");
    });
  });
});
