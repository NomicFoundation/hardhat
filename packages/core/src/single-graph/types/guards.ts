import type {
  CallableFuture,
  DependableFuture,
  OptionalParameter,
  RecipeFuture,
  RequiredParameter,
} from "./future";
import { Artifact } from "./hardhat";
import type {
  RecipeVertex,
  HardhatContractRecipeVertex,
  ArtifactContractRecipeVertex,
  DeployedContractRecipeVertex,
  CallRecipeVertex,
  HardhatLibraryRecipeVertex,
  ArtifactLibraryRecipeVertex,
} from "./recipeGraph";

export function isArtifact(artifact: any): artifact is Artifact {
  return (
    artifact !== null &&
    artifact !== undefined &&
    artifact.bytecode &&
    artifact.abi
  );
}

export function isHardhatContract(
  node: RecipeVertex
): node is HardhatContractRecipeVertex {
  return node.type === "HardhatContract";
}

export function isArtifactContract(
  node: RecipeVertex
): node is ArtifactContractRecipeVertex {
  return node.type === "ArtifactContract";
}

export function isDeployedContract(
  node: RecipeVertex
): node is DeployedContractRecipeVertex {
  return node.type === "DeployedContract";
}

export function isCall(node: RecipeVertex): node is CallRecipeVertex {
  return node.type === "Call";
}

export function isHardhatLibrary(
  node: RecipeVertex
): node is HardhatLibraryRecipeVertex {
  return node.type === "HardhatLibrary";
}

export function isArtifactLibrary(
  node: RecipeVertex
): node is ArtifactLibraryRecipeVertex {
  return node.type === "ArtifactLibrary";
}

export function isFuture(possible: {}): possible is RecipeFuture {
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
      possible.type === "library")
  );
}

export function isParameter(
  future: RecipeFuture
): future is RequiredParameter | OptionalParameter {
  return future.type === "parameter";
}

export function isCallable(future: RecipeFuture): future is CallableFuture {
  return future.type === "contract" || future.type === "library";
}
