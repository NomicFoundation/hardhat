import { DeployState } from "@ignored/ignition-core";
import { Box, Text } from "ink";

export const SummarySection = ({
  deployState: {
    details: { moduleName },
  },
}: {
  deployState: DeployState;
}) => {
  return (
    <Box margin={1}>
      <Text bold={true}>
        Deploying module <Text italic={true}>{moduleName}</Text>
      </Text>
    </Box>
  );
};
