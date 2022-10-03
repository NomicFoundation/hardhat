import { DeployState } from "@nomicfoundation/ignition-core";
import React from "react";

import { StartingPanel } from "./StartingPanel";
import { ValidationFailedPanel } from "./ValidationFailedPanel";
import { ExecutionPanel } from "./execution/ExecutionPanel";

export const IgnitionUi = ({ deployState }: { deployState: DeployState }) => {
  if (
    deployState.phase === "uninitialized" ||
    deployState.phase === "validating"
  ) {
    return <StartingPanel />;
  }

  if (deployState.phase === "validation-failed") {
    return <ValidationFailedPanel deployState={deployState} />;
  }

  return <ExecutionPanel deployState={deployState} />;
};
