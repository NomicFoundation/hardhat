import { assert } from "chai";

import { isFakeRoot, isRootUser } from "../../../src/internal/util/root-user";

describe("Root user check", function () {
  describe("isRootUser", function () {
    it("should return false for null user id", function () {
      assert.isFalse(isRootUser(null));
    });

    it("should return false for a non zero user id", function () {
      assert.isFalse(isRootUser(10001));
    });

    it("should return true for a zero user id", function () {
      assert.isTrue(isRootUser(0));
    });
  });

  describe("isFakeRoot", function () {
    let oldKey: string | undefined;
    beforeEach(function () {
      oldKey = process.env.FAKEROOTKEY;
      delete process.env.FAKEROOTKEY;
    });

    it("should not return true if FAKEROOTKEY is not set", function () {
      assert.isFalse(isFakeRoot());
    });

    it("should return true if FAKEROOTKEY is set", function () {
      process.env.FAKEROOTKEY = "15574641";
      assert.isTrue(isFakeRoot());
    });

    afterEach(function () {
      if (oldKey !== undefined) {
        process.env.FAKEROOTKEY = oldKey;
      }
    });
  });
});
