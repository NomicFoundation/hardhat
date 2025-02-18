import { buildModule } from "@ignored/hardhat-vnext-ignition-core";

export default buildModule("MyModule", (m) => {
  const foo = m.contract("Foo");

  return { foo };
});
