import { IDeploymentGraph } from "./deploymentGraph";
import { IExecutionGraph } from "./executionGraph";

export interface IgnitionPlan {
  deploymentGraph: IDeploymentGraph;
  executionGraph: IExecutionGraph;
}
