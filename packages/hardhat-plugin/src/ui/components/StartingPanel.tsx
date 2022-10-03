import { Box, Text } from "ink";
import Spinner from "ink-spinner";

export const StartingPanel = () => {
  return (
    <Box>
      <Text>
        Ignition starting <Spinner type="simpleDots" />
      </Text>
    </Box>
  );
};
