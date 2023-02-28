import type { IDeploymentBuilder } from "types/deploymentGraph";
import type { FutureDict } from "types/future";
import { Subgraph } from "types/module";

export function buildSubgraph<T extends FutureDict>(
  subgraphName: string,
  subgraphAction: (m: IDeploymentBuilder) => T
): Subgraph<T> {
  return {
    name: subgraphName,
    action: subgraphAction,
  };
}
