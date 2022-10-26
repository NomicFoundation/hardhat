const { assert } = require("chai");
const SimpleRecipe = require("../ignition/Simple");

describe("Simple", function () {
  let simpleContract;

  before(async () => {
    const { simple } = await ignition.deploy(SimpleRecipe, {
      parameters: {
        IncAmount: 42,
      },
    });

    simpleContract = simple;
  });

  it("should return an instantiated ethers contract", async function () {
    assert.isDefined(simpleContract);
  });

  it("should have incremented the count with the deployment config call", async function () {
    assert.equal(await simpleContract.count(), 52);
  });
});
