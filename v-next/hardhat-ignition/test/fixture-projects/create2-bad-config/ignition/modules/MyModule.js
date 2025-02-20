import { buildModule } from "@nomicfoundation/ignition-core";

export default buildModule("MyModule", (m) => {
  const foo = m.contract("Foo");

  return { foo };
});
