import {
  DeploymentResultType,
  ExecutionErrorDeploymentResult,
  IgnitionModuleResult,
  ReconciliationErrorDeploymentResult,
  SuccessfulDeploymentResult,
  ValidationErrorDeploymentResult,
} from "@ignored/ignition-core";
import { Box, Newline, Text } from "ink";

import { UiState } from "../../types";

import { AddressResults } from "./AddressResults";
import { Divider } from "./Divider";

export const FinalStatus = ({ state }: { state: UiState }) => {
  if (state.result === null) {
    return null;
  }

  switch (state.result.type) {
    case DeploymentResultType.VALIDATION_ERROR: {
      return (
        <ErrorResult
          chainId={state.chainId!}
          moduleName={state.moduleName!}
          message="Validation failed for module"
          result={state.result}
        />
      );
    }
    case DeploymentResultType.RECONCILIATION_ERROR: {
      return (
        <ErrorResult
          chainId={state.chainId!}
          moduleName={state.moduleName!}
          message="Reconciliation failed for module"
          result={state.result}
        />
      );
    }
    case DeploymentResultType.EXECUTION_ERROR: {
      return (
        <ExecutionErrorResult
          chainId={state.chainId!}
          moduleName={state.moduleName!}
          result={state.result}
        />
      );
    }
    case DeploymentResultType.SUCCESSFUL_DEPLOYMENT: {
      return (
        <SuccessfulResult
          chainId={state.chainId!}
          moduleName={state.moduleName!}
          result={state.result}
        />
      );
    }
  }
};

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
      <Newline />
    </Box>
  );
};

const ErrorResult: React.FC<{
  moduleName: string;
  chainId: number;
  message: string;
  result: ReconciliationErrorDeploymentResult | ValidationErrorDeploymentResult;
}> = ({ moduleName, message, result }) => {
  return (
    <Box margin={0} flexDirection="column">
      <Divider />

      <Text>
        ⛔ {message} <Text italic={true}>{moduleName}</Text>
      </Text>

      <Divider />

      <Box flexDirection="column" marginTop={1}>
        {Object.entries(result.errors).map(([futureId, futureErrors]) => (
          <Text key={futureId}>
            {futureId} <Text color="red">errors:</Text>
            <Newline />
            {futureErrors.map((error, i) => (
              <Text key={i}>
                {" "}
                - {error}
                <Newline />
              </Text>
            ))}
          </Text>
        ))}
      </Box>

      <Text> </Text>
    </Box>
  );
};

const ExecutionErrorResult: React.FC<{
  moduleName: string;
  chainId: number;
  result: ExecutionErrorDeploymentResult;
}> = ({ moduleName, result }) => {
  return (
    <Box margin={0} flexDirection="column">
      <Divider />

      <Text>
        ⛔ Execution failed for module <Text italic={true}>{moduleName}</Text>
      </Text>

      <Divider />

      <Box flexDirection="column" margin={0}>
        {result.timedOut.length > 0 && (
          <Box flexDirection="column" margin={0} marginBottom={1}>
            <Text color="yellow">
              Timed Out:
              <Newline />
            </Text>
            {result.timedOut.map(({ futureId, executionId }) => (
              <Text key={futureId}>
                - {futureId}/{executionId}
              </Text>
            ))}
          </Box>
        )}

        {result.failed.length > 0 && (
          <Box flexDirection="column" margin={0} marginBottom={1}>
            <Text color="red">
              Failed:
              <Newline />
            </Text>

            {result.failed.map(({ futureId, executionId, error }) => (
              <Text key={futureId}>
                - {futureId}/{executionId}: {error}
              </Text>
            ))}
          </Box>
        )}
      </Box>

      <Newline />
    </Box>
  );
};
