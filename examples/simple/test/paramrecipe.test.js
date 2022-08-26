const { assert } = require("chai");
const ParamRecipe = require("../ignition/ParamRecipe");

describe("Param Recipe", function () {
  it("should be able to pass parameters", async function () {
    const { foo } = await ignition.deploySingleGraph(ParamRecipe, {
      parameters: {
        IncAmount: 42,
      },
    });

    assert.isDefined(foo);

    assert.equal(await foo.x(), 52);
  });
});
