import { DeployState, ModuleParams } from "@ignored/ignition-core";
import { Box, Text, Spacer } from "ink";

import { ModuleParameters } from "./ModuleParameters";
import { NetworkInfo } from "./NetworkInfo";

export const SummarySection = ({
  deployState: {
    details: { moduleName, ...networkInfo },
  },
  moduleParams,
}: {
  deployState: DeployState;
  moduleParams?: ModuleParams;
}) => {
  return (
    <Box margin={1} flexDirection="column">
      <Box marginBottom={1} flexDirection="row">
        <Text bold={true}>
          Deploying module <Text italic={true}>{moduleName}</Text>
        </Text>
        <Spacer />
        <NetworkInfo networkInfo={networkInfo} />
      </Box>
      <ModuleParameters moduleParams={moduleParams} />
    </Box>
  );
};
