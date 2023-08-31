import {
  DeploymentResultType,
  IgnitionModuleResult,
  SuccessfulDeploymentResult,
} from "@ignored/ignition-core";
import { Box, Text } from "ink";

import { UiFuture, UiFutureStatusType, UiState } from "../../types";

import { AddressResults } from "./AddressResults";
import { Divider } from "./Divider";

export const FinalStatus = ({ state }: { state: UiState }) => {
  const allFutures = state.batches.flat();

  if (state.result?.type === DeploymentResultType.SUCCESSFUL_DEPLOYMENT) {
    return (
      <SuccessfulResult
        chainId={state.chainId!}
        moduleName={state.moduleName!}
        result={state.result}
      />
    );
  }

  const pendingFutures = allFutures.filter(
    (f) => f.status.type === UiFutureStatusType.PENDING
  );

  if (pendingFutures.length > 0) {
    return (
      <Box flexDirection="column">
        <Divider />

        <Box>
          <Text>
            🟡 <Text italic={true}>{"moduleName"}</Text> deployment{" "}
            <Text bold color="yellow">
              on hold
            </Text>
          </Text>
        </Box>

        <Box flexDirection="column">
          {pendingFutures.map((f) => (
            <Box key={`hold-${f.futureId}`} flexDirection="column" margin={1}>
              <Text bold={true}>{f.futureId}</Text>
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  const erroredFutures = allFutures.filter(
    (f) => f.status.type === UiFutureStatusType.ERRORED
  );

  if (state.result?.type === DeploymentResultType.EXECUTION_ERROR) {
    const errors = getErrors(erroredFutures);

    return (
      <Box flexDirection="column">
        <Divider />

        <Box>
          <Text>
            ⛔ <Text italic={true}>{"moduleName"}</Text> deployment{" "}
            <Text bold color="red">
              failed
            </Text>
          </Text>
        </Box>

        <Box flexDirection="column">
          {errors.map((e) => (
            <Box key={`error-${e.futureId}`} flexDirection="column" margin={1}>
              <Text bold={true} underline={true}>
                {e.futureId}
              </Text>
              <Text>{e.message}</Text>
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  return null;
};

function getErrors(futures: UiFuture[]) {
  const output = [];

  for (const future of futures) {
    if (future.status.type === UiFutureStatusType.ERRORED) {
      output.push({
        futureId: future.futureId,
        message: future.status.message,
      });
    }
  }

  return output;
}

const SuccessfulResult: React.FC<{
  moduleName: string;
  chainId: number;
  result: SuccessfulDeploymentResult<string, IgnitionModuleResult<string>>;
}> = ({ moduleName, chainId, result }) => {
  return (
    <Box margin={0} flexDirection="column">
      <Divider />

      <Text>
        🚀 Deployment Complete for module{" "}
        <Text italic={true}>{moduleName}</Text>
      </Text>

      <Divider />
      <AddressResults chainId={chainId} contracts={result.contracts} />
      <Text> </Text>
    </Box>
  );
};
