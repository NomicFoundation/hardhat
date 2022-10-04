import { ethers } from "ethers";

import { Services } from "services/types";
import { ResultsAccumulator, VertexVisitResult } from "types/graph";
import { ArtifactLibraryRecipeVertex } from "types/recipeGraph";
import { isArtifact } from "utils/guards";

export async function validateArtifactLibrary(
  vertex: ArtifactLibraryRecipeVertex,
  _resultAccumulator: ResultsAccumulator,
  _context: { services: Services }
): Promise<VertexVisitResult> {
  const artifactExists = isArtifact(vertex.artifact);

  if (!artifactExists) {
    return {
      _kind: "failure",
      failure: new Error(`Artifact not provided for library '${vertex.label}'`),
    };
  }

  const argsLength = vertex.args.length;

  const iface = new ethers.utils.Interface(vertex.artifact.abi);
  const expectedArgsLength = iface.deploy.inputs.length;

  if (argsLength !== expectedArgsLength) {
    return {
      _kind: "failure",
      failure: new Error(
        `The constructor of the library '${vertex.label}' expects ${expectedArgsLength} arguments but ${argsLength} were given`
      ),
    };
  }

  return {
    _kind: "success",
    result: undefined,
  };
}
