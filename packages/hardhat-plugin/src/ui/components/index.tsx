import type { DeploymentParameters } from "@nomicfoundation/ignition-core";

import { UiState, UiStateDeploymentStatus } from "../types";

import { StartingPanel } from "./StartingPanel";
import { ExecutionPanel } from "./execution/ExecutionPanel";

export const IgnitionUi = ({
  state,
  deployParams,
}: {
  state: UiState;
  deployParams?: DeploymentParameters;
}) => {
  if (state.status === UiStateDeploymentStatus.UNSTARTED) {
    return <StartingPanel />;
  }

  return <ExecutionPanel state={state} deployParams={deployParams} />;
};
