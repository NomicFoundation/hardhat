import { DeploymentParameters } from "@ignored/ignition-core";
import { Box, Text, Spacer } from "ink";

import { UiState } from "../../types";

import { DeployParameters } from "./DeployParameters";
import { NetworkInfo } from "./NetworkInfo";

export const SummarySection = ({
  state: { chainId },
  deployParams,
}: {
  state: UiState;
  deployParams?: DeploymentParameters;
}) => {
  // todo: moduleName and networkName
  return (
    <Box marginBottom={0} flexDirection="column">
      <Box marginTop={1} flexDirection="row">
        <Text bold={true}>
          Deploying module <Text italic={true}>{"moduleName"}</Text>
        </Text>
        <Spacer />
        <NetworkInfo
          networkInfo={{ chainId: chainId!, networkName: "networkName" }}
        />
      </Box>
      <DeployParameters deployParams={deployParams} />
    </Box>
  );
};
