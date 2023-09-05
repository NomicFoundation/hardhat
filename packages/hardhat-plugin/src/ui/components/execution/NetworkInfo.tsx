import { Text } from "ink";

export const NetworkInfo = ({
  networkInfo: { chainId },
}: {
  networkInfo: {
    chainId: number;
  };
}) => {
  return <Text>Chain ID: {chainId}</Text>;
};
