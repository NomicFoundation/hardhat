import { buildModule } from "@nomicfoundation/ignition-core";

export default buildModule("OwnModule", (m) => {
  const ownable = m.contract("Ownable");

  return { ownable };
});
