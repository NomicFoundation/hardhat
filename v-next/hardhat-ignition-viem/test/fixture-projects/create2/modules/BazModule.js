import { buildModule } from "@nomicfoundation/ignition-core";

export default buildModule("BazModule", (m) => {
  const foo = m.contract("Baz");

  return { foo };
});
