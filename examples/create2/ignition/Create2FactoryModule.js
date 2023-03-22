const { buildModule } = require("@ignored/hardhat-ignition");

module.exports = buildModule("Create2Factory", (m) => {
  const Create2Artifact = m.getArtifact("Create2Factory");
  const BarArtifact = m.getArtifact("Bar");
  const FooArtifact = m.getArtifact("Foo");

  const create2 = m.contract("Create2Factory", Create2Artifact, { args: [] });

  const fooCall = m.call(create2, "deploy", {
    args: [0, toBytes32(1), FooArtifact.bytecode],
  });

  const fooEvent = m.event(create2, "Deployed", {
    args: [toBytes32(1)],
    after: [fooCall],
  });

  const barCall = m.call(create2, "deploy", {
    args: [0, toBytes32(2), BarArtifact.bytecode],
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

  return { create2, foo, bar };
});

function toBytes32(n) {
  return hre.ethers.utils.hexZeroPad(hre.ethers.utils.hexlify(n), 32);
}
