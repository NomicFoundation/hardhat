import { ethers } from "ethers";

import { Services } from "services/types";
import { ResultsAccumulator, VertexVisitResult } from "types/graph";
import { HardhatLibraryRecipeVertex } from "types/recipeGraph";

export async function validateHardhatLibrary(
  vertex: HardhatLibraryRecipeVertex,
  _resultAccumulator: ResultsAccumulator,
  { services }: { services: Services }
): Promise<VertexVisitResult> {
  const artifactExists = await services.artifacts.hasArtifact(
    vertex.libraryName
  );

  if (!artifactExists) {
    return {
      _kind: "failure",
      failure: new Error(
        `Library with name '${vertex.libraryName}' doesn't exist`
      ),
    };
  }

  const artifact = await services.artifacts.getArtifact(vertex.libraryName);
  const argsLength = vertex.args.length;

  const iface = new ethers.utils.Interface(artifact.abi);
  const expectedArgsLength = iface.deploy.inputs.length;

  if (argsLength !== expectedArgsLength) {
    return {
      _kind: "failure",
      failure: new Error(
        `The constructor of the library '${vertex.libraryName}' expects ${expectedArgsLength} arguments but ${argsLength} were given`
      ),
    };
  }

  return {
    _kind: "success",
    result: undefined,
  };
}
