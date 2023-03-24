import { Graph } from "../internal/graph/Graph";
import {
  DeploymentGraphVertex as DeploymentGraphVertex,
  ScopeData,
} from "../internal/types/deploymentGraph";

export class DeploymentGraph extends Graph<DeploymentGraphVertex> {
  public scopeData: {
    [key: string]: ScopeData;
  };

  constructor() {
    super();

    this.scopeData = {};
  }
}
