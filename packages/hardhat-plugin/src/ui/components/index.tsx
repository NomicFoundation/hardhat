import {
  DeployState,
  IgnitionError,
  ModuleParams,
} from "@ignored/ignition-core";

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
  if (
    deployState.phase === "uninitialized" ||
    deployState.phase === "validating"
  ) {
    return <StartingPanel />;
  }

  if (deployState.phase === "validation-failed") {
    return <ValidationFailedPanel deployState={deployState} />;
  }

  if (deployState.phase === "failed-unexpectedly") {
    return <UnexpectedErrorPanel deployState={deployState} />;
  }

  if (deployState.phase === "reconciliation-failed") {
    return <ReconciliationFailedPanel deployState={deployState} />;
  }

  if (
    deployState.phase === "execution" ||
    deployState.phase === "complete" ||
    deployState.phase === "failed" ||
    deployState.phase === "hold"
  ) {
    return (
      <ExecutionPanel deployState={deployState} moduleParams={moduleParams} />
    );
  }

  return assertNeverPhase(deployState.phase);
};

function assertNeverPhase(deployStatePhase: never): null {
  throw new IgnitionError(`Unknown deploy state phase ${deployStatePhase}`);
}
