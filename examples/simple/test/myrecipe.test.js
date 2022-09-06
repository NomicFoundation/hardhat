const { assert } = require("chai");
const MyRecipe = require("../ignition/MyRecipe");

describe("My Recipe", function () {
  it("should be able to deploy and read contracts", async function () {
    const { foo } = await ignition.deploy(MyRecipe);

    assert.isDefined(foo);

    assert.equal(await foo.x(), 10);
  });
});
