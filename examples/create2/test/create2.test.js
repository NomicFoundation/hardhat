const { assert } = require("chai");

const Create2FactoryModule = require("../ignition/Create2FactoryModule");

describe("Create2", function () {
  let deployResults;

  before(async () => {
    deployResults = await ignition.deploy(Create2FactoryModule);
  });

  it("should return an instantiated factory", async function () {
    assert.isDefined(deployResults.create2);
  });
});
