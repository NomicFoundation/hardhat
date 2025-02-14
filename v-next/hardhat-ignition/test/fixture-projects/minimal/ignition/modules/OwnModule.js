import { buildModule } from "@ignored/hardhat-vnext-ignition-core";

export default buildModule("OwnModule", (m) => {
  const ownable = m.contract("Ownable");

  return { ownable };
});
