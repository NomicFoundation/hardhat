import { ethers } from "ethers";

import { Services } from "services/types";
import { HardhatLibraryDeploymentVertex } from "types/deploymentGraph";
import { ResultsAccumulator, VertexVisitResult } from "types/graph";
import { InvalidArtifactError } from "utils/errors";

import { validateBytesForArtifact } from "./helpers";

export async function validateHardhatLibrary(
  vertex: HardhatLibraryDeploymentVertex,
  _resultAccumulator: ResultsAccumulator,
  { services }: { services: Services }
): Promise<VertexVisitResult> {
  const invalidBytes = await validateBytesForArtifact(vertex.args, services);

  if (invalidBytes !== null) {
    return invalidBytes;
  }

  const artifactExists = await services.artifacts.hasArtifact(
    vertex.libraryName
  );

  if (!artifactExists) {
    return {
      _kind: "failure",
      failure: new InvalidArtifactError(vertex.libraryName),
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
