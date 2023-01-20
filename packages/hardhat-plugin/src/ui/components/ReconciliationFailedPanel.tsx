import { DeployState } from "@ignored/ignition-core";
import { Box, Text } from "ink";

export const ReconciliationFailedPanel = ({
  deployState,
}: {
  deployState: DeployState;
}) => {
  return (
    <Box flexDirection="column">
      <Text color={"red"}>
        Ignition cannot rerun the module{" "}
        <Text bold>{deployState.details.moduleName}</Text>, it has been altered
        since the last run.
      </Text>

      <Box marginTop={1}>
        <Text>
          Remove the journal file to restart the deployment from a clean state.
        </Text>
      </Box>
    </Box>
  );
};
