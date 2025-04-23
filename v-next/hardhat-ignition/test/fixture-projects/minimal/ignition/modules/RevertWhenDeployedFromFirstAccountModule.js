import { buildModule } from "@nomicfoundation/ignition-core";

export default buildModule("RevertWhenDeployedFromFirstAccount", (m) => {
  const revertWhenDeployedFromFirstAccount = m.contract(
    "RevertWhenDeployedFromFirstAccount",
  );

  return { revertWhenDeployedFromFirstAccount };
});
