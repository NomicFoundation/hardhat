const chai = require("chai");

const { solidity } = waffle;

chai.use(solidity);

const { expect } = chai;

describe("explicit chai.use", function () {
  it("should have bn matchers loaded", function () {
    expect(ethers.BigNumber.from(993)).to.equal(993);
  });
});
