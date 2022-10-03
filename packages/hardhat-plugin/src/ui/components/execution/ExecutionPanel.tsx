import { DeployState } from "@nomicfoundation/ignition-core";
import { Box } from "ink";

import { BatchExecution } from "./BatchExecution";
import { FinalStatus } from "./FinalStatus";
import { SummarySection } from "./SummarySection";

export const ExecutionPanel = ({
  deployState,
}: {
  deployState: DeployState;
}) => {
  return (
    <Box flexDirection="column">
      <SummarySection deployState={deployState} />
      <BatchExecution deployState={deployState} />
      <FinalStatus deployState={deployState} />
    </Box>
  );
};
