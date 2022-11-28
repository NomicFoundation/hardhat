import type { DeployState, ModuleParams } from "@ignored/ignition-core";
import { Box } from "ink";

import { BatchExecution } from "./BatchExecution";
import { FinalStatus } from "./FinalStatus";
import { SummarySection } from "./SummarySection";

export const ExecutionPanel = ({
  deployState,
  moduleParams,
}: {
  deployState: DeployState;
  moduleParams?: ModuleParams;
}) => {
  return (
    <Box flexDirection="column">
      <SummarySection deployState={deployState} moduleParams={moduleParams} />
      <BatchExecution deployState={deployState} />
      <FinalStatus deployState={deployState} />
    </Box>
  );
};
