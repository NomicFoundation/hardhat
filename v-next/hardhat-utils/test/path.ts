import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveFromRoot } from "../src/path.js";

describe("path", () => {
  describe("resolveFromRoot", () => {
    it("Should resolve an absolute path", () => {
      const root = "/root";
      const target = "/target";

      assert.equal(resolveFromRoot(root, target), target);
    });

    it("Should resolve a relative path", () => {
      const root = "/root";
      const target = "target";

      assert.equal(resolveFromRoot(root, target), "/root/target");
    });

    it("Should resolve a relative path with . and ..", () => {
      const root = "/root";
      const target = "./.././target";

      assert.equal(resolveFromRoot(root, target), "/target");
    });
  });
});
