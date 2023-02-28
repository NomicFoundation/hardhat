import type { ExecutionContext } from "types/deployment";
import type {
  ExecutionResultsAccumulator,
  ExecutionVertex,
  ExecutionVertexVisitResult,
} from "types/executionGraph";
import { IgnitionError } from "utils/errors";

import { executeAwaitedEvent } from "./executeAwaitedEvent";
import { executeContractCall } from "./executeContractCall";
import { executeContractDeploy } from "./executeContractDeploy";
import { executeDeployedContract } from "./executeDeployedContract";
import { executeLibraryDeploy } from "./executeLibraryDeploy";
import { executeSendETH } from "./executeSendETH";

export function executionDispatch(
  executionVertex: ExecutionVertex,
  resultAccumulator: ExecutionResultsAccumulator,
  context: ExecutionContext
): Promise<ExecutionVertexVisitResult> {
  switch (executionVertex.type) {
    case "ContractDeploy":
      return executeContractDeploy(executionVertex, resultAccumulator, context);
    case "DeployedContract":
      return executeDeployedContract(
        executionVertex,
        resultAccumulator,
        context
      );
    case "ContractCall":
      return executeContractCall(executionVertex, resultAccumulator, context);
    case "LibraryDeploy":
      return executeLibraryDeploy(executionVertex, resultAccumulator, context);
    case "AwaitedEvent":
      return executeAwaitedEvent(executionVertex, resultAccumulator, context);
    case "SentETH":
      return executeSendETH(executionVertex, resultAccumulator, context);
    default:
      assertUnknownExecutionVertexType(executionVertex);
  }
}

function assertUnknownExecutionVertexType(executionVertex: never): never {
  const vertex = executionVertex as any;

  const forReport = "type" in vertex ? vertex.type : vertex;

  throw new IgnitionError(`Unknown execution vertex type: ${forReport}`);
}
