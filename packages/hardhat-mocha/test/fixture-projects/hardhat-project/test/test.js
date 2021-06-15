const { assert } = require("chai");

describe("Test suit run in sequential mode", function () {
  it("Should see the modification of the root hook in setup.js", function () {
    assert.equal(global.asd, 123);
  });
});
