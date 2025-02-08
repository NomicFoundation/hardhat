import { buildModule } from "@ignored/hardhat-vnext-ignition-core";

export default buildModule("MyModule", (m) => {
  const bar = m.contract("Bar");
  const usesContract = m.contract("UsesContract", [
    "0x0000000000000000000000000000000000000000",
  ]);

  m.call(usesContract, "setAddress", [bar]);

  return { bar, usesContract };
});
