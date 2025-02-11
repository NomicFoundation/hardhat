import { buildModule } from "@ignored/hardhat-vnext-ignition-core";

export default buildModule("BazModule", (m) => {
  const foo = m.contract("Baz");

  return { foo };
});
