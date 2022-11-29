import { ExecutionContext } from "types/deployment";
import { ExecutionVertex } from "types/executionGraph";
import { ResultsAccumulator, VertexVisitResult } from "types/graph";

import { executeAwaitedEvent } from "./executeAwaitedEvent";
import { executeContractCall } from "./executeContractCall";
import { executeContractDeploy } from "./executeContractDeploy";
import { executeDeployedContract } from "./executeDeployedContract";
import { executeLibraryDeploy } from "./executeLibraryDeploy";

export function executionDispatch(
  executionVertex: ExecutionVertex,
  resultAccumulator: ResultsAccumulator,
  context: ExecutionContext
): Promise<VertexVisitResult> {
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
    default:
      return assertUnknownExecutionVertexType(executionVertex);
  }
}

function assertUnknownExecutionVertexType(
  executionVertex: never
): Promise<VertexVisitResult> {
  const vertex = executionVertex as any;

  const forReport = "type" in vertex ? vertex.type : vertex;

  throw new Error(`Unknown execution vertex type: ${forReport}`);
}
