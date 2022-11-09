import { Text } from "ink";

export const NetworkInfo = ({
  networkInfo: { chainId, networkName },
}: {
  networkInfo: {
    chainId: number;
    networkName: string;
  };
}) => {
  return (
    <Text>
      Network: {networkName} ({chainId})
    </Text>
  );
};
