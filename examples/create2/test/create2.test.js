const { assert } = require("chai");
const { buildModule } = require("@ignored/hardhat-ignition");

const Create2FactoryModule = require("../ignition/Create2FactoryModule");

describe("Create2", function () {
  let factory;

  before(async () => {
    const DeployViaCreate2Module = buildModule(
      "DeployViaCreate2Module",
      (m) => {
        const { create2 } = m.useModule(Create2FactoryModule);

        m.call(create2, "deploy", {
          args: [0, toBytes32(1), m.getBytesForArtifact("Foo")],
        });

        m.call(create2, "deploy", {
          args: [0, toBytes32(2), m.getBytesForArtifact("Bar")],
        });

        return { create2 };
      }
    );

    const { create2 } = await ignition.deploy(DeployViaCreate2Module);

    factory = create2;
  });

  it("should return an instantiated factory", async function () {
    assert.isDefined(factory);
  });

  it("should have deployed the foo contract", async () => {
    const address = await resolveAddressBasedOnSalt(factory, 1);
    const FooFactory = await hre.ethers.getContractFactory("Foo");
    const foo = FooFactory.attach(address);

    assert.equal(await foo.name(), "Foo");
  });

  it("should have deployed the bar contract", async () => {
    const address = await resolveAddressBasedOnSalt(factory, 2);
    const FooFactory = await hre.ethers.getContractFactory("Bar");
    const foo = FooFactory.attach(address);

    assert.equal(await foo.name(), "Bar");
  });
});

function toBytes32(n) {
  return hre.ethers.utils.hexZeroPad(hre.ethers.utils.hexlify(n), 32);
}

async function resolveAddressBasedOnSalt(factory, salt) {
  const deployedEvents = await factory.queryFilter(
    factory.filters.Deployed(toBytes32(salt))
  );

  return deployedEvents[0].args.deployed;
}
