import { buildModule } from "@ignored/hardhat-vnext-ignition-core";

export default buildModule("RevertWhenDeployedFromFirstAccount", (m) => {
  const revertWhenDeployedFromFirstAccount = m.contract(
    "RevertWhenDeployedFromFirstAccount",
  );

  return { revertWhenDeployedFromFirstAccount };
});
