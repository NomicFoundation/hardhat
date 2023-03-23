import { IDeploymentGraph } from "../internal/types/deploymentGraph";
import { IExecutionGraph } from "../internal/types/executionGraph";

/**
 * The planned deployment.
 *
 * @internal
 */
export interface IgnitionPlan {
  deploymentGraph: IDeploymentGraph;
  executionGraph: IExecutionGraph;
}
