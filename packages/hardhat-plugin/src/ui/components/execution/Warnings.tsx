import { Box, Newline, Text } from "ink";

import { UiState } from "../../types";

export const Warnings = ({ state: { warnings } }: { state: UiState }) => {
  return (
    <>
      <Box
        paddingBottom={1}
        borderStyle="single"
        flexDirection="column"
        borderColor="yellowBright"
      >
        <Text bold>
          Warning, deployment missing previously executed futures:
        </Text>
        <Newline />

        {...warnings.map((warning) => <Text> - {warning}</Text>)}
      </Box>
    </>
  );
};
