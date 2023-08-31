import { Box, Spacer, Text } from "ink";

import { AddressMap, UiFuture, UiFutureStatusType } from "../../types";

import { NetworkInfo } from "./NetworkInfo";

export const AddressResults = ({
  futures,
  chainId,
}: {
  futures: UiFuture[];
  chainId: number;
}) => {
  const addressMap = resolveDeployAddresses(futures);

  return (
    <Box flexDirection="column">
      <Box flexDirection="row" marginBottom={1}>
        <Text>Deployed Addresses</Text>
        <Spacer />
        <NetworkInfo networkInfo={{ chainId }} />
      </Box>

      {...Object.entries(addressMap).map(([label, address]) => (
        <Text>
          {label} {`->`} {address}
        </Text>
      ))}
    </Box>
  );
};

function resolveDeployAddresses(futures: UiFuture[]): AddressMap {
  const addressMap: AddressMap = {};

  for (const future of futures) {
    if (
      future.status.type === UiFutureStatusType.SUCCESS &&
      future.status.result !== undefined
    ) {
      addressMap[future.futureId] = future.status.result;
    }
  }

  return addressMap;
}
