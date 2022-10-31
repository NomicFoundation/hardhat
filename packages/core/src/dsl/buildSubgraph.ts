import type { IDeploymentBuilder, Subgraph } from "types/deploymentGraph";
import type { FutureDict } from "types/future";

export function buildSubgraph<T extends FutureDict>(
  subgraphName: string,
  subgraphAction: (m: IDeploymentBuilder) => T
): Subgraph<T> {
  return {
    name: subgraphName,
    action: subgraphAction,
  };
}
