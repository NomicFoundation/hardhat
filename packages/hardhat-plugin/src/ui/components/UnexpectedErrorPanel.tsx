import { DeployState } from "@ignored/ignition-core";
import { Box, Text } from "ink";

export const UnexpectedErrorPanel = ({
  deployState,
}: {
  deployState: DeployState;
}) => {
  return (
    <Box flexDirection="column">
      <Text>
        Ignition <Text color="red">failed</Text> with an error for{" "}
        {deployState.details.moduleName}
      </Text>

      <Box flexDirection="column" marginTop={1}>
        {deployState.unexpected.errors.map((err, i) => (
          <ErrorBox key={`err-${i}`} error={err} />
        ))}
      </Box>
    </Box>
  );
};

export const ErrorBox = ({ error }: { error: Error }) => {
  return <Text>{error.message}</Text>;
};
