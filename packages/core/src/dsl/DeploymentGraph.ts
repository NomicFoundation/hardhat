import { Graph } from "graph/Graph";
import { DeploymentGraphVertex as DeploymentGraphVertex } from "types/deploymentGraph";
import { DeploymentGraphFuture } from "types/future";

export class DeploymentGraph extends Graph<DeploymentGraphVertex> {
  public registeredParameters: {
    [key: string]: { [key: string]: string | number | DeploymentGraphFuture };
  };

  constructor() {
    super();

    this.registeredParameters = {};
  }
}
