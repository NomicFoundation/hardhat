
import { buildModule } from "@ignored/hardhat-vnext-ignition-core";

export default buildModule("FooModule", (m) => {
  const foo = m.contract("Foo");

  return { foo };
});
