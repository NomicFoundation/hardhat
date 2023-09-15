import { DeploymentParameters } from "@nomicfoundation/ignition-core";
import { Box, Spacer, Text } from "ink";

import { UiState } from "../../types";

import { DeployParameters } from "./DeployParameters";
import { NetworkInfo } from "./NetworkInfo";

export const SummarySection = ({
  state: { chainId, moduleName },
  deployParams,
}: {
  state: UiState;
  deployParams?: DeploymentParameters;
}) => {
  return (
    <Box marginBottom={0} flexDirection="column">
      <Box marginTop={1} flexDirection="row">
        <Text bold={true}>
          Deploying module <Text italic={true}>{moduleName}</Text>
        </Text>
        <Spacer />
        <NetworkInfo networkInfo={{ chainId: chainId! }} />
      </Box>
      <DeployParameters deployParams={deployParams} />
    </Box>
  );
};
