import { SuccessfulDeploymentResult } from "@nomicfoundation/ignition-core";
import { Box, Spacer, Text } from "ink";

import { NetworkInfo } from "./NetworkInfo";

export const AddressResults = ({
  contracts,
  chainId,
}: {
  contracts: SuccessfulDeploymentResult["contracts"];
  chainId: number;
}) => {
  return (
    <Box flexDirection="column">
      <Box flexDirection="row" marginBottom={1}>
        <Text>Deployed Addresses</Text>
        <Spacer />
        <NetworkInfo networkInfo={{ chainId }} />
      </Box>

      {Object.values(contracts).map((contract) => (
        <Text key={contract.id}>
          {contract.id} {`->`} {contract.address}
        </Text>
      ))}
    </Box>
  );
};
