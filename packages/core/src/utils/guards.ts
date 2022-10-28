import type {
  DeploymentGraphVertex,
  HardhatContractDeploymentVertex,
  ArtifactContractDeploymentVertex,
  DeployedContractDeploymentVertex,
  CallDeploymentVertex,
  HardhatLibraryDeploymentVertex,
  ArtifactLibraryDeploymentVertex,
  Subgraph,
} from "types/deploymentGraph";
import type {
  CallableFuture,
  DependableFuture,
  OptionalParameter,
  DeploymentGraphFuture,
  RequiredParameter,
  Virtual,
} from "types/future";
import { Artifact } from "types/hardhat";
import { Module } from "types/module";

export function isArtifact(artifact: any): artifact is Artifact {
  return (
    artifact !== null &&
    artifact !== undefined &&
    artifact.bytecode &&
    artifact.abi
  );
}

export function isHardhatContract(
  node: DeploymentGraphVertex
): node is HardhatContractDeploymentVertex {
  return node.type === "HardhatContract";
}

export function isArtifactContract(
  node: DeploymentGraphVertex
): node is ArtifactContractDeploymentVertex {
  return node.type === "ArtifactContract";
}

export function isDeployedContract(
  node: DeploymentGraphVertex
): node is DeployedContractDeploymentVertex {
  return node.type === "DeployedContract";
}

export function isCall(
  node: DeploymentGraphVertex
): node is CallDeploymentVertex {
  return node.type === "Call";
}

export function isHardhatLibrary(
  node: DeploymentGraphVertex
): node is HardhatLibraryDeploymentVertex {
  return node.type === "HardhatLibrary";
}

export function isArtifactLibrary(
  node: DeploymentGraphVertex
): node is ArtifactLibraryDeploymentVertex {
  return node.type === "ArtifactLibrary";
}

export function isFuture(possible: {}): possible is DeploymentGraphFuture {
  return (
    possible !== undefined &&
    possible !== null &&
    typeof possible === "object" &&
    "_future" in possible
  );
}

export function isDependable(possible: any): possible is DependableFuture {
  return (
    isFuture(possible) &&
    (possible.type === "call" ||
      possible.type === "contract" ||
      possible.type === "library" ||
      possible.type === "virtual")
  );
}

export function isVirtual(possible: any): possible is Virtual {
  return isFuture(possible) && possible.type === "virtual";
}

export function isParameter(
  future: DeploymentGraphFuture
): future is RequiredParameter | OptionalParameter {
  return future.type === "parameter";
}

export function isCallable(
  future: DeploymentGraphFuture
): future is CallableFuture {
  return future.type === "contract" || future.type === "library";
}

export function isSubgraph(subgraph: {}): subgraph is Subgraph {
  return `subgraphAction` in subgraph;
}

export function isModule(mod: {}): mod is Module {
  return `moduleAction` in mod;
}
