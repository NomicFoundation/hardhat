import { DeployState, ExecutionVertex } from "@ignored/ignition-core";
import { Box, Text } from "ink";

import { DeploymentError, AddressMap } from "ui/types";

import { AddressResults } from "./AddressResults";
import { Divider } from "./Divider";

export const FinalStatus = ({ deployState }: { deployState: DeployState }) => {
  if (deployState.phase === "complete") {
    const addressMap: AddressMap = {};

    for (const value of deployState.execution.resultsAccumulator.values()) {
      if (
        value !== null &&
        value._kind === "success" &&
        "name" in value.result &&
        "address" in value.result
      ) {
        addressMap[value.result.name] = value.result.address;
      }
    }

    const networkInfo = {
      chainId: deployState.details.chainId,
      networkName: deployState.details.networkName,
    };

    return (
      <Box flexDirection="column">
        <Divider />

        <Text>
          🚀 Deployment Complete for module{" "}
          <Text italic={true}>{deployState.details.moduleName}</Text>
        </Text>

        <Divider />
        <AddressResults addressMap={addressMap} networkInfo={networkInfo} />
        <Text> </Text>
      </Box>
    );
  }

  if (deployState.phase === "failed") {
    const deploymentErrors: DeploymentError[] =
      getDeploymentErrors(deployState);

    return (
      <Box flexDirection="column">
        <Divider />

        <Box>
          <Text>
            ⛔ <Text italic={true}>{deployState.details.moduleName}</Text>{" "}
            deployment{" "}
            <Text bold color="red">
              failed
            </Text>
          </Text>
        </Box>

        <Box flexDirection="column">
          {deploymentErrors.map((de) => (
            <DepError key={`error-${de.id}`} deploymentError={de} />
          ))}
        </Box>
      </Box>
    );
  }

  return null;
};

const getDeploymentErrors = (deployState: DeployState): DeploymentError[] => {
  return [...deployState.execution.errored]
    .map((id) => {
      const vertexResult = deployState.execution.resultsAccumulator.get(id);

      if (
        vertexResult === undefined ||
        vertexResult === null ||
        vertexResult._kind === "success"
      ) {
        return null;
      }

      const failure = vertexResult.failure;

      const vertex = deployState.transform.executionGraph?.vertexes.get(id);

      if (vertex === undefined) {
        return null;
      }

      const errorDescription = buildErrorDescriptionFrom(failure, vertex);

      return errorDescription;
    })
    .filter((x): x is DeploymentError => x !== null);
};

const buildErrorDescriptionFrom = (
  error: Error,
  vertex: ExecutionVertex
): DeploymentError => {
  const message = "reason" in error ? (error as any).reason : error.message;

  return {
    id: vertex.id,
    vertex: vertex.label,
    message,
    failureType: resolveFailureTypeFrom(vertex),
  };
};

const resolveFailureTypeFrom = (vertex: ExecutionVertex): string => {
  switch (vertex.type) {
    case "ContractCall":
      return "Failed contract call";
    case "ContractDeploy":
      return "Failed contract deploy";
    case "DeployedContract":
      return "-";
    case "LibraryDeploy":
      return "Failed library deploy";
    case "AwaitedEvent":
      return "Failed awaited event";
    case "SentETH":
      return "Failed to send ETH";
    default:
      return assertNeverUiVertexType(vertex);
  }
};

function assertNeverUiVertexType(vertex: never): string {
  throw new Error(`Unexpected ui vertex type ${vertex}`);
}

const DepError = ({
  deploymentError,
}: {
  deploymentError: DeploymentError;
}) => {
  return (
    <Box flexDirection="column" margin={1}>
      <Text bold={true}>
        {deploymentError.failureType} - {deploymentError.vertex}
      </Text>
      <Text>{deploymentError.message}</Text>
    </Box>
  );
};
