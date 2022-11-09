import { Box, Spacer, Text } from "ink";

import { AddressMap } from "ui/types";

import { NetworkInfo } from "./NetworkInfo";

export const AddressResults = ({
  addressMap,
  networkInfo,
}: {
  addressMap: AddressMap;
  networkInfo: { chainId: number; networkName: string };
}) => {
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
