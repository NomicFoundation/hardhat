const { assert } = require("chai");

describe("Test suit run in parallel mode", function () {
  describe("Fails on purpose", function () {
    it("Shouldn't see the modification of the root hook in setup.js", function () {
      assert.equal(global.asd, 123);
    });
  });
});
