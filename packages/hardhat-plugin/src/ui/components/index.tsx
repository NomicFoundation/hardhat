import { DeployState, ModuleParams } from "@ignored/ignition-core";

import { ReconciliationFailedPanel } from "./ReconciliationFailedPanel";
import { StartingPanel } from "./StartingPanel";
import { UnexpectedErrorPanel } from "./UnexpectedErrorPanel";
import { ValidationFailedPanel } from "./ValidationFailedPanel";
import { ExecutionPanel } from "./execution/ExecutionPanel";

export const IgnitionUi = ({
  deployState,
  moduleParams,
}: {
  deployState: DeployState;
  moduleParams?: ModuleParams;
}) => {
  switch (deployState.phase) {
    case "uninitialized":
    case "validating":
      return <StartingPanel />;
    case "validation-failed":
      return <ValidationFailedPanel deployState={deployState} />;
    case "failed-unexpectedly":
      return <UnexpectedErrorPanel deployState={deployState} />;
    case "reconciliation-failed":
      return <ReconciliationFailedPanel deployState={deployState} />;
    case "execution":
    case "complete":
    case "failed":
    case "hold":
      return (
        <ExecutionPanel deployState={deployState} moduleParams={moduleParams} />
      );
  }
};
