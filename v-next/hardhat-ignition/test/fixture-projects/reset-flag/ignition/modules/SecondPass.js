import { buildModule } from "@nomicfoundation/ignition-core";

export default buildModule("ResetModule", (m) => {
  // Same id as first pass but a different contract
  const a = m.contract("Bar", [], {
    id: "A",
  });

  const b = m.contract("Baz", [], {
    id: "B",
  });

  return { a, b };
});
