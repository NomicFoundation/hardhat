import type { DeploymentParameters } from "@ignored/ignition-core";

import { UiState } from "../types";

import { StartingPanel } from "./StartingPanel";
import { ExecutionPanel } from "./execution/ExecutionPanel";

export const IgnitionUi = ({
  state,
  deployParams,
}: {
  state: UiState;
  deployParams?: DeploymentParameters;
}) => {
  if (state.futures.length === 0) {
    return <StartingPanel />;
  }

  return <ExecutionPanel state={state} deployParams={deployParams} />;
};
