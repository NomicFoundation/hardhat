import { Services } from "../../services/types";
import { getSortedVertexIdsFrom } from "../graph/utils";
import { visit } from "../graph/visit";
import { ExecutionVertex, IExecutionGraph } from "../types/executionGraph";
import { VisitResult } from "../types/graph";
import { DeploymentState } from "../ui/types";
import { UiService } from "../ui/ui-service";

import { executionDispatch } from "./dispatch/executionDispatch";

export async function execute(
  executionGraph: IExecutionGraph,
  services: Services,
  ui: UiService
): Promise<VisitResult> {
  const orderedVertexIds = getSortedVertexIdsFrom(executionGraph);

  const uiDeploymentState = setupUiDeploymentState(
    executionGraph,
    ui,
    orderedVertexIds
  );

  return visit(
    "Execution",
    orderedVertexIds,
    executionGraph,
    { services },
    new Map<number, any>(),
    executionDispatch,
    (vertex, kind, error) => {
      if (kind === "success") {
        uiDeploymentState.setExeuctionVertexAsSuccess(vertex);
      } else if (kind === "failure") {
        uiDeploymentState.setExecutionVertexAsFailure(vertex, error);
      } else {
        throw new Error(`Unknown kind ${kind}`);
      }

      ui.render();
    }
  );
}

function setupUiDeploymentState(
  executionGraph: IExecutionGraph,
  ui: UiService,
  orderedVertexIds: number[]
): DeploymentState {
  const uiDeploymentState: DeploymentState = new DeploymentState();

  uiDeploymentState.setExecutionVertexes(
    orderedVertexIds
      .map((vid) => executionGraph.vertexes.get(vid))
      .filter((vertex): vertex is ExecutionVertex => vertex !== undefined)
  );

  ui.setDeploymentState(uiDeploymentState);

  return uiDeploymentState;
}
