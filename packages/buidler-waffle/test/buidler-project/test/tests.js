const { expect } = require("chai");

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

  describe("Usupported methods", function () {
    it("Should print the right error for calledOnContractWith", function () {
      try {
        expect("balanceOf").to.be.calledOnContractWith("asd", ["asd"]);
      } catch (error) {
        if (error.message.includes("is not supported by Buidler")) {
          return;
        }
      }

      throw Error("Should have failed");
    });

    it("Should print the right error for calledOnContract", function () {
      try {
        expect("balanceOf").to.be.calledOnContract("asd");
      } catch (error) {
        if (error.message.includes("is not supported by Buidler")) {
          return;
        }
      }

      throw Error("Should have failed");
    });
  });
});
