const env = require("../core/importable-environment");
const assert = require("chai").assert;
const Contract = env.artifacts.require("Contract");

// How to run tests is up to the user, importing env is enough. Still, this one
// is also run by buidler test.

describe("Standalone mocha tests", () => {
  it("Should be deployable", async () => {
    const contract = await Contract.new();
    assert.notEqual(contract.address, "0x0");
  });
});
