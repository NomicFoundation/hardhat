const { buildModule } = require("@ignored/hardhat-ignition");

const Create2Artifact = require("../artifacts/contracts/Create2Factory.sol/Create2Factory.json");
const BarArtifact = require("../artifacts/contracts/Bar.sol/Bar.json");
const FooArtifact = require("../artifacts/contracts/Foo.sol/Foo.json");

module.exports = buildModule("Create2Factory", (m) => {
  const create2 = m.contract("Create2Factory", Create2Artifact, { args: [] });

  const fooCall = m.call(create2, "deploy", {
    args: [0, toBytes32(1), m.getBytesForArtifact("Foo")],
  });

  const fooEvent = m.event(create2, "Deployed", {
    args: [toBytes32(1)],
    after: [fooCall],
  });

  const barCall = m.call(create2, "deploy", {
    args: [0, toBytes32(2), m.getBytesForArtifact("Bar")],
    after: [fooEvent],
  });

  const barEvent = m.event(create2, "Deployed", {
    args: [toBytes32(2)],
    after: [barCall],
  });

  const foo = m.contractAt("Foo", fooEvent.params.deployed, FooArtifact.abi, {
    after: [fooEvent],
  });

  const bar = m.contractAt("Bar", barEvent.params.deployed, BarArtifact.abi, {
    after: [barEvent],
  });

  return { create2, foo, bar, fooEvent, barEvent };
});

function toBytes32(n) {
  return hre.ethers.utils.hexZeroPad(hre.ethers.utils.hexlify(n), 32);
}
