import { DeployState } from "@ignored/ignition-core";
import { Box, Text, Spacer } from "ink";

import { NetworkInfo } from "./NetworkInfo";

export const SummarySection = ({
  deployState: {
    details: { moduleName, ...networkInfo },
  },
}: {
  deployState: DeployState;
}) => {
  return (
    <Box margin={1} flexDirection="row">
      <Text bold={true}>
        Deploying module <Text italic={true}>{moduleName}</Text>
      </Text>
      <Spacer />
      <NetworkInfo networkInfo={networkInfo} />
    </Box>
  );
};
