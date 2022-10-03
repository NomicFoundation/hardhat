import { Deployment } from "deployment/Deployment";
import { VisitResult } from "types/graph";

import { visitInBatches } from "./batch/visitInBatches";
import { executionDispatch } from "./dispatch/executionDispatch";

export async function execute(deployment: Deployment): Promise<VisitResult> {
  if (deployment.state.transform.executionGraph === null) {
    throw new Error("Cannot execute without an execution graph");
  }

  return visitInBatches(
    deployment,
    deployment.state.transform.executionGraph,
    executionDispatch
  );
}
