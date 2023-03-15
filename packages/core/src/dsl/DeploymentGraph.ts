import { Graph } from "../graph/Graph";
import {
  DeploymentGraphVertex as DeploymentGraphVertex,
  ScopeData,
} from "../types/deploymentGraph";

export class DeploymentGraph extends Graph<DeploymentGraphVertex> {
  public scopeData: {
    [key: string]: ScopeData;
  };

  constructor() {
    super();

    this.scopeData = {};
  }
}
