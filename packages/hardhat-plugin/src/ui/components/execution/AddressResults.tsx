import { Box, Text } from "ink";

import { AddressMap } from "ui/types";

export const AddressResults = ({ addressMap }: { addressMap: AddressMap }) => {
  return (
    <Box flexDirection="column">
      <Text>Deployed Addresses:</Text>
      {...Object.entries(addressMap).map(([label, address]) => (
        <Text>
          {label} {`->`} {address}
        </Text>
      ))}
    </Box>
  );
};
