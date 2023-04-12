import type { ModuleParams } from "@ignored/ignition-core";

import { DeployState } from "@ignored/ignition-core/soon-to-be-removed";
import { Box } from "ink";

import { BatchExecution } from "./BatchExecution";
import { FinalStatus } from "./FinalStatus";
import { SummarySection } from "./SummarySection";
import { viewEverthingExecutedAlready } from "./views";

export const ExecutionPanel = ({
  deployState,
  moduleParams,
}: {
  deployState: DeployState;
  moduleParams?: ModuleParams;
}) => {
  if (viewEverthingExecutedAlready(deployState)) {
    return (
      <Box flexDirection="column">
        <FinalStatus deployState={deployState} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <SummarySection deployState={deployState} moduleParams={moduleParams} />
      <BatchExecution deployState={deployState} />
      <FinalStatus deployState={deployState} />
    </Box>
  );
};
