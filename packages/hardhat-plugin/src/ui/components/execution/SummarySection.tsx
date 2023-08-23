import { ModuleParams } from "@ignored/ignition-core";
import { DeployState } from "@ignored/ignition-core/soon-to-be-removed";
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
    <Box marginBottom={0} flexDirection="column">
      <Box marginTop={1} flexDirection="row">
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
