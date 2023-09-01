import { Box, Text } from "ink";
import Spinner from "ink-spinner";

import {
  UiFuture,
  UiFutureStatusType,
  UiState,
  UiStateDeploymentStatus,
} from "../../types";

import { Divider } from "./Divider";

export const BatchExecution = ({ state }: { state: UiState }) => {
  const isComplete = state.status === UiStateDeploymentStatus.COMPLETE;

  return (
    <>
      <Divider />

      <Box paddingBottom={1}>
        {isComplete ? (
          <Text bold>Execution complete</Text>
        ) : (
          <Text bold>
            Executing <Spinner type="simpleDots" />
          </Text>
        )}
      </Box>

      {state.batches.map((batch, i) => (
        <Batch key={`batch-${i}`} batch={batch} index={i}></Batch>
      ))}
    </>
  );
};

const Batch = ({ batch, index }: { batch: UiFuture[]; index: number }) => {
  const borderColor = resolveBatchBorderColor(batch);

  return (
    <Box borderStyle="single" flexDirection="column" borderColor={borderColor}>
      <Box flexDirection="row-reverse">
        <Text>#{index}</Text>
      </Box>

      {batch.map((future, i) => (
        <Future key={`batch-${index}-vertex-${i}`} future={future}></Future>
      ))}
    </Box>
  );
};

const Future = ({ future }: { future: UiFuture }) => {
  const { borderColor, borderStyle, textColor } = resolveFutureColors(future);

  return (
    <Box borderStyle={borderStyle} borderColor={borderColor}>
      <StatusBadge future={future} />
      <Text color={textColor}>{future.futureId}</Text>
    </Box>
  );
};

const StatusBadge = ({ future }: { future: UiFuture }) => {
  let badge: any = " ";
  switch (future.status.type) {
    case UiFutureStatusType.UNSTARTED:
      badge = <Spinner />;
      break;
    case UiFutureStatusType.SUCCESS:
      badge = <Text>✅</Text>;
      break;
    case UiFutureStatusType.PENDING:
      badge = <Text>🔶</Text>;
      break;
    case UiFutureStatusType.ERRORED:
      badge = <Text>❌</Text>;
      break;
  }

  return (
    <>
      <Text> </Text>
      {badge}
      <Text> </Text>
    </>
  );
};

function resolveBatchBorderColor(futures: UiFuture[]) {
  if (futures.some((v) => v.status.type === UiFutureStatusType.UNSTARTED)) {
    return "lightgray";
  }

  if (futures.some((v) => v.status.type === UiFutureStatusType.ERRORED)) {
    return "red";
  }

  if (futures.some((v) => v.status.type === UiFutureStatusType.PENDING)) {
    return "yellow";
  }

  if (futures.every((v) => v.status.type === UiFutureStatusType.SUCCESS)) {
    return "green";
  }

  return "lightgray";
}

function resolveFutureColors(future: UiFuture): {
  borderColor: string;
  borderStyle: "single" | "classic" | "bold" | "singleDouble";
  textColor: string;
} {
  switch (future.status.type) {
    case UiFutureStatusType.UNSTARTED:
      return {
        borderColor: "lightgray",
        borderStyle: "singleDouble",
        textColor: "white",
      };
    case UiFutureStatusType.SUCCESS:
      return {
        borderColor: "greenBright",
        borderStyle: "single",
        textColor: "white",
      };
    case UiFutureStatusType.PENDING:
      return {
        borderColor: "yellow",
        borderStyle: "bold",
        textColor: "white",
      };
    case UiFutureStatusType.ERRORED:
      return {
        borderColor: "redBright",
        borderStyle: "bold",
        textColor: "white",
      };
  }
}
