import { buildModule } from "@ignored/hardhat-vnext-ignition-core";

export default buildModule("ResetModule", (m) => {
  const a = m.contract("Foo", [], {
    id: "A",
  });

  return { a };
});
