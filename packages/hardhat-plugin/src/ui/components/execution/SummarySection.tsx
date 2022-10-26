import { DeployState } from "@ignored/ignition-core";
import { Box, Text } from "ink";

export const SummarySection = ({
  deployState: {
    details: { recipeName },
  },
}: {
  deployState: DeployState;
}) => {
  return (
    <Box margin={1}>
      <Text bold={true}>
        Deploying recipe <Text italic={true}>{recipeName}</Text>
      </Text>
    </Box>
  );
};
