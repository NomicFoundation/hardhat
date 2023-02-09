import { getSortedVertexIdsFrom } from "graph/utils";
import { visit } from "graph/visit";
import { Services } from "services/types";
import { IDeploymentGraph } from "types/deploymentGraph";
import { VertexVisitResult, VisitResult } from "types/graph";
import { IgnitionError } from "utils/errors";

import { validationDispatch } from "./dispatch/validationDispatch";

export async function validateDeploymentGraph(
  deploymentGraph: IDeploymentGraph,
  services: Services
): Promise<VisitResult> {
  try {
    const orderedVertexIds = getSortedVertexIdsFrom(deploymentGraph);

    return await visit(
      "Validation",
      orderedVertexIds,
      deploymentGraph,
      { services },
      new Map<number, VertexVisitResult | null>(),
      validationDispatch
    );
  } catch (err) {
    if (!(err instanceof Error)) {
      return {
        _kind: "failure",
        failures: [
          "Unsuccessful module validation",
          [new IgnitionError("Unknown validation error")],
        ],
      };
    }

    return {
      _kind: "failure",
      failures: ["Unsuccessful module validation", [err]],
    };
  }
}
