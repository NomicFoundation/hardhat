const env = require("../src/env");
const assert = require('chai').assert;


// How to run tests is up to the user, importing env is enough.

describe("Contract", () => {

  let Contract;
  let contractCode;

  before(async () => {
    Contract = await env.getContract("Contract");
    contractCode = await env.getContractCode("Contract");
  });

  it("Should be deployable", async () => {
    const contract = await env.deploy(Contract, contractCode);
    assert.notEqual(contract.address, "0x0")
  });

});

