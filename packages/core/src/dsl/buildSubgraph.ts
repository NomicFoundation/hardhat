import type { IDeploymentBuilder, Subgraph } from "types/deploymentGraph";
import type { FutureDict } from "types/future";

export function buildSubgraph(
  subgraphName: string,
  subgraphAction: (m: IDeploymentBuilder) => FutureDict
): Subgraph {
  return {
    name: subgraphName,
    subgraphAction,
  };
}
