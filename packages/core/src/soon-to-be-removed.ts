// WARNING: Do not import anything from here. These things are meant to be
// internal or replaced soon, and will be removed from the public API ASAP.
// Consider yourself warned.

import { IDeploymentGraph } from "./internal/types/deploymentGraph";
import { IExecutionGraph } from "./internal/types/executionGraph";

export {
  DeploymentResultState,
  DeploymentResult,
  DeployStateExecutionCommand,
  DeployState,
  DeployPhase,
  UpdateUiAction,
} from "./internal/types/deployment";
export {
  DeploymentGraphVertex,
  IDeploymentGraph,
} from "./internal/types/deploymentGraph";
export {
  ExecutionVertex,
  ExecutionVertexType,
  IExecutionGraph,
} from "./internal/types/executionGraph";
export {
  VertexResultEnum,
  VertexVisitResultFailure,
  VertexDescriptor,
  VertexGraph,
} from "./internal/types/graph";
export { ICommandJournal } from "./internal/types/journal";

export interface LegacyIgnitionPlan {
  deploymentGraph: IDeploymentGraph;
  executionGraph: IExecutionGraph;
}
