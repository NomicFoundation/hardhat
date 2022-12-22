import { DeployState } from "@ignored/ignition-core";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";

import { UiBatch, UiVertex, UiVertexStatus } from "../../types";

import { Divider } from "./Divider";

export const BatchExecution = ({
  deployState,
}: {
  deployState: DeployState;
}) => {
  const batches = resolveBatchesFrom(deployState);

  if (batches.length === 0) {
    return null;
  }

  return (
    <>
      <Divider />

      <Box paddingBottom={1}>
        {deployState.phase === "execution" ? (
          <>
            <Text bold>
              Executing <Spinner type="simpleDots" />
            </Text>
          </>
        ) : (
          <>
            <Text bold>Executed</Text>
          </>
        )}
      </Box>

      {batches.map((batch, i) => (
        <Batch key={`batch-${i}`} batch={batch}></Batch>
      ))}
    </>
  );
};

const Batch = ({ batch }: { batch: UiBatch }) => {
  const borderColor = resolveBatchBorderColor(batch.vertexes);

  return (
    <Box borderStyle="single" flexDirection="column" borderColor={borderColor}>
      <Box flexDirection="row-reverse">
        <Text>#{batch.batchCount}</Text>
      </Box>

      {batch.vertexes.map((vertex, i) => (
        <Vertex
          key={`batch-${batch.batchCount}-vertex-${i}`}
          vertex={vertex}
        ></Vertex>
      ))}
    </Box>
  );
};

const Vertex = ({ vertex }: { vertex: UiVertex }) => {
  const { borderColor, borderStyle, textColor } = resolveVertexColors(vertex);

  return (
    <Box borderStyle={borderStyle} borderColor={borderColor}>
      <StatusBadge vertex={vertex} />
      <Text color={textColor}>{vertex.label}</Text>
    </Box>
  );
};

const StatusBadge = ({ vertex }: { vertex: UiVertex }) => {
  let badge: any = " ";
  switch (vertex.status) {
    case "COMPELETED":
      badge = <Text>✅</Text>;
      break;
    case "ERRORED":
      badge = <Text>❌</Text>;
      break;
    case "HELD":
      badge = <Text>🔶</Text>;
      break;
    case "RUNNING":
      badge = <Spinner />;
      break;
    default:
      return assertNeverVertexStatus(vertex.status);
  }

  return (
    <>
      <Text> </Text>
      {badge}
      <Text> </Text>
    </>
  );
};

function resolveBatchBorderColor(vertexes: UiVertex[]) {
  if (vertexes.some((v) => v.status === "RUNNING")) {
    return "lightgray";
  }

  if (vertexes.some((v) => v.status === "ERRORED")) {
    return "red";
  }

  if (vertexes.some((v) => v.status === "HELD")) {
    return "yellow";
  }

  if (vertexes.every((v) => v.status === "COMPELETED")) {
    return "green";
  }

  return "lightgray";
}

function resolveVertexColors(vertex: UiVertex): {
  borderColor: string;
  borderStyle: "single" | "classic" | "bold" | "singleDouble";
  textColor: string;
} {
  switch (vertex.status) {
    case "COMPELETED":
      return {
        borderColor: "greenBright",
        borderStyle: "single",
        textColor: "white",
      };
    case "RUNNING":
      return {
        borderColor: "lightgray",
        borderStyle: "singleDouble",
        textColor: "white",
      };
    case "HELD":
      return {
        borderColor: "yellow",
        borderStyle: "bold",
        textColor: "white",
      };
    case "ERRORED":
      return {
        borderColor: "redBright",
        borderStyle: "bold",
        textColor: "white",
      };
    default:
      return assertNeverVertexStatus(vertex.status);
  }
}

const resolveBatchesFrom = (deployState: DeployState): UiBatch[] => {
  const stateBatches =
    deployState.execution.batch !== null
      ? [
          ...deployState.execution.previousBatches,
          deployState.execution.batch.keys(),
        ]
      : deployState.execution.previousBatches;

  return stateBatches.map((sb, i) => ({
    batchCount: i,
    vertexes: [...sb]
      .sort()
      .map((vertexId): UiVertex | null => {
        const vertex =
          deployState.transform.executionGraph?.vertexes.get(vertexId);

        if (vertex === undefined) {
          return null;
        }

        const uiVertex: UiVertex = {
          id: vertex.id,
          label: vertex.label,
          type: vertex.type,
          status: determineStatusOf(deployState, vertex.id),
        };

        return uiVertex;
      })
      .filter((v): v is UiVertex => v !== null),
  }));
};

const determineStatusOf = (
  deployState: DeployState,
  vertexId: number
): UiVertexStatus => {
  const execution = deployState.execution;

  if (execution.vertexes[vertexId]?.status === "RUNNING") {
    return "RUNNING";
  }

  if (execution.vertexes[vertexId]?.status === "FAILED") {
    return "ERRORED";
  }

  if (execution.vertexes[vertexId]?.status === "HOLD") {
    return "HELD";
  }

  if (execution.vertexes[vertexId]?.status === "COMPLETED") {
    return "COMPELETED";
  }

  throw new Error(`Unable to determine vertex status for ${vertexId}`);
};

function assertNeverVertexStatus(status: never): any {
  throw new Error(`Unexpected vertex status ${status}`);
}
