import { DeployState } from "@ignored/ignition-core";
import { viewExecutionResults } from "@ignored/ignition-core/helpers";
import { Box, Spacer, Text } from "ink";

import { AddressMap } from "../../types";

import { NetworkInfo } from "./NetworkInfo";

export const AddressResults = ({
  deployState,
}: {
  deployState: DeployState;
}) => {
  const addressMap = resolveDeployAddresses(deployState);

  const networkInfo = {
    chainId: deployState.details.chainId,
    networkName: deployState.details.networkName,
  };

  return (
    <Box flexDirection="column">
      <Box flexDirection="row" marginBottom={1}>
        <Text>Deployed Addresses</Text>
        <Spacer />
        <NetworkInfo networkInfo={networkInfo} />
      </Box>

      {...Object.entries(addressMap).map(([label, address]) => (
        <Text>
          {label} {`->`} {address}
        </Text>
      ))}
    </Box>
  );
};

const resolveDeployAddresses = (deployState: DeployState) => {
  const addressMap: AddressMap = {};

  for (const value of viewExecutionResults(deployState).values()) {
    if (
      value !== undefined &&
      value._kind === "success" &&
      "name" in value.result &&
      "address" in value.result
    ) {
      addressMap[value.result.name] = value.result.address;
    }
  }

  return addressMap;
};
