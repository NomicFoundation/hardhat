import type { DeploymentParameters } from "@nomicfoundation/ignition-core";

import { Box } from "ink";

import { UiState } from "../../types";

import { BatchExecution } from "./BatchExecution";
import { FinalStatus } from "./FinalStatus";
import { SummarySection } from "./SummarySection";
import { Warnings } from "./Warnings";
import { viewEverythingExecutedAlready } from "./views";

export const ExecutionPanel = ({
  state,
  deployParams,
}: {
  state: UiState;
  deployParams?: DeploymentParameters;
}) => {
  if (viewEverythingExecutedAlready(state)) {
    return (
      <Box flexDirection="column">
        {state.warnings.length > 0 && <Warnings state={state} />}
        <FinalStatus state={state} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <SummarySection state={state} deployParams={deployParams} />
      {state.warnings.length > 0 && <Warnings state={state} />}
      <BatchExecution state={state} />
      <FinalStatus state={state} />
    </Box>
  );
};
