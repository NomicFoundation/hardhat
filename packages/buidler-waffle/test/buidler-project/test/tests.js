describe("Internal test suite of buidler-waffle's test project", function () {
  it("Should have waffle assertions loaded", function () {
    const chai = require("chai");
    if (!("revertedWith" in chai.Assertion.prototype)) {
      throw new Error("Failed to load it");
    }
  });

  it("Should fail", function () {
    throw new Error("Failed on purpose");
  });
});
