import { IgnitionError } from "../../errors";
import { ProcessStepResult } from "../../types/process";
import { getSortedVertexIdsFrom } from "../graph/utils";
import { visit } from "../graph/visit";
import { CallPoints, IDeploymentGraph } from "../types/deploymentGraph";
import { ResultsAccumulator } from "../types/graph";
import { Services } from "../types/services";
import {
  processStepErrored,
  processStepFailed,
  processStepSucceeded,
} from "../utils/process-results";

import { validationDispatch } from "./dispatch/validationDispatch";

export async function validateDeploymentGraph(
  deploymentGraph: IDeploymentGraph,
  callPoints: CallPoints,
  services: Services
): Promise<ProcessStepResult<ResultsAccumulator<undefined>>> {
  try {
    const orderedVertexIds = getSortedVertexIdsFrom(deploymentGraph);

    const visitResult = await visit(
      "Validation",
      orderedVertexIds,
      deploymentGraph,
      { services, callPoints },
      new Map<number, undefined>(),
      validationDispatch
    );

    switch (visitResult._kind) {
      case "success":
        return processStepSucceeded(visitResult.result);
      case "failure":
        return processStepFailed("Validation failed", visitResult.failures[1]);
      case "hold":
        throw new IgnitionError("Holds not exepected in validation");
    }
  } catch (err) {
    return processStepErrored(err, "Validation failed");
  }
}
