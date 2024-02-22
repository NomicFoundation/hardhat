import { assert } from "chai";

import * as nested from "../../fixture-projects/nested-node-project/project/nested-caller-package-tester";
import * as top from "../../fixture-projects/nested-node-project/top-caller-package-tester";

describe("getClosestCallerPackage", () => {
  top.callFromNestedModule();
  top.callFromTopModule();
  top.indirectlyCallFromTopModule();

  describe("When calling directly from a package", () => {
    it("Should return the package it was called from", () => {
      assert.strictEqual(top.callFromTopModule(), "top-level-node-project");
      assert.strictEqual(nested.callFromNestedModule(), "nested-node-project");
    });
  });

  describe("When calling indirectly", () => {
    it("Should return the closest package from where it was called", () => {
      assert.strictEqual(top.callFromNestedModule(), "nested-node-project");
      assert.strictEqual(top.indirectlyCallFromTopModule(), "top-level-node-project");

      assert.strictEqual(nested.callFromTopModule(), "top-level-node-project");
      assert.strictEqual(
        nested.indirectlyCallFromNestedpModule(),
        "nested-node-project"
      );
    });
  });
});
