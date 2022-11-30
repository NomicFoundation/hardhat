import { ethers } from "ethers";

import { Services } from "services/types";
import { ArtifactLibraryDeploymentVertex } from "types/deploymentGraph";
import { ResultsAccumulator, VertexVisitResult } from "types/graph";
import { isArtifact } from "utils/guards";

import { validateBytesForArtifact } from "./helpers";

export async function validateArtifactLibrary(
  vertex: ArtifactLibraryDeploymentVertex,
  _resultAccumulator: ResultsAccumulator,
  _context: { services: Services }
): Promise<VertexVisitResult> {
  const invalidBytes = await validateBytesForArtifact(
    vertex.args,
    _context.services
  );

  if (invalidBytes !== null) {
    return invalidBytes;
  }

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
