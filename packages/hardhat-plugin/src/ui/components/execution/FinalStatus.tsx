import { DeployState, ExecutionVertex } from "@ignored/ignition-core";
import { viewExecutionResults } from "@ignored/ignition-core/helpers";
import { Box, Text } from "ink";

import { DeploymentError, DeploymentHold } from "../../types";

import { AddressResults } from "./AddressResults";
import { Divider } from "./Divider";
import { viewEverthingExecutedAlready } from "./views";

export const FinalStatus = ({ deployState }: { deployState: DeployState }) => {
  if (deployState.phase === "complete") {
    if (viewEverthingExecutedAlready(deployState)) {
      return (
        <Box margin={0} flexDirection="column">
          <Divider />

          <Text>
            Nothing new to deploy, everything deployed on a previous run of{" "}
            <Text italic={true}>{deployState.details.moduleName}</Text>
          </Text>

          <Divider />
          <AddressResults deployState={deployState} />
          <Text> </Text>
        </Box>
      );
    }

    return (
      <Box margin={0} flexDirection="column">
        <Divider />

        <Text>
          🚀 Deployment Complete for module{" "}
          <Text italic={true}>{deployState.details.moduleName}</Text>
        </Text>

        <Divider />
        <AddressResults deployState={deployState} />
        <Text> </Text>
      </Box>
    );
  }

  if (deployState.phase === "hold") {
    const deploymentHolds: DeploymentHold[] = getDeploymentHolds(deployState);

    return (
      <Box flexDirection="column">
        <Divider />

        <Box>
          <Text>
            🟡 <Text italic={true}>{deployState.details.moduleName}</Text>{" "}
            deployment{" "}
            <Text bold color="yellow">
              on hold
            </Text>
          </Text>
        </Box>

        <Box flexDirection="column">
          {deploymentHolds.map((dh) => (
            <DepHold key={`hold-${dh.id}`} deploymentHold={dh} />
          ))}
        </Box>
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
  const executionResults = viewExecutionResults(deployState);

  return Object.entries(deployState.execution.vertexes)
    .filter(([_id, v]) => v.status === "FAILED")
    .map(([id]) => parseInt(id, 10))
    .map((id) => {
      const vertexResult = executionResults.get(id);

      if (
        vertexResult === undefined ||
        vertexResult === null ||
        vertexResult._kind === "success" ||
        vertexResult._kind === "hold"
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

const getDeploymentHolds = (deployState: DeployState): DeploymentHold[] => {
  return Object.entries(deployState.execution.vertexes)
    .filter(([_id, v]) => v.status === "HOLD")
    .map(([id]) => parseInt(id, 10))
    .map((id) => {
      const vertex = deployState.transform.executionGraph?.vertexes.get(id);

      if (vertex === undefined) {
        return null;
      }

      const holdDescription = buildHoldDescriptionFrom(vertex);

      return holdDescription;
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

const buildHoldDescriptionFrom = (vertex: ExecutionVertex): DeploymentHold => {
  return {
    id: vertex.id,
    vertex: vertex.label,
    event: vertex.type === "AwaitedEvent" ? vertex.event : undefined,
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
  }
};

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

const DepHold = ({ deploymentHold }: { deploymentHold: DeploymentHold }) => {
  if (deploymentHold.event === undefined) {
    return (
      <Box flexDirection="column" margin={1}>
        <Text bold={true}>{deploymentHold.vertex}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" margin={1}>
      <Text>
        <Text bold={true}>{deploymentHold.vertex}</Text> waiting on event{" "}
        <Text bold={true}>{deploymentHold.event}</Text>
      </Text>
    </Box>
  );
};
