import { Box, Text } from "ink";

export const Divider = () => {
  return (
    <Box flexDirection="column" paddingTop={1} paddingBottom={1}>
      <Box width="100%">
        <Text wrap="truncate">
          {Array.from({ length: 400 })
            .map((_i) => "─")
            .join("")}
        </Text>
      </Box>
    </Box>
  );
};
