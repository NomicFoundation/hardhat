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

  it("should have deployed the foo contract", async () => {
    const address = deployResults.fooEvent.deployed;
    const FooFactory = await hre.ethers.getContractFactory("Foo");
    const foo = FooFactory.attach(address);

    assert.equal(await foo.name(), "Foo");
  });

  it("should have deployed the bar contract", async () => {
    const address = deployResults.barEvent.deployed;
    const BarFactory = await hre.ethers.getContractFactory("Bar");
    const bar = BarFactory.attach(address);

    assert.equal(await bar.name(), "Bar");
  });
});
