import { getSortedVertexIdsFrom } from "graph/utils";
import { visit } from "graph/visit";
import { Services } from "services/types";
import { IDeploymentGraph } from "types/deploymentGraph";
import { VertexVisitResult, VisitResult } from "types/graph";

import { validationDispatch } from "./dispatch/validationDispatch";

export function validateDeploymentGraph(
  deploymentGraph: IDeploymentGraph,
  services: Services
): Promise<VisitResult> {
  const orderedVertexIds = getSortedVertexIdsFrom(deploymentGraph);

  return visit(
    "Validation",
    orderedVertexIds,
    deploymentGraph,
    { services },
    new Map<number, VertexVisitResult | null>(),
    validationDispatch
  );
}
