import { ethers } from "ethers";

import { HardhatLibraryDeploymentVertex } from "types/deploymentGraph";
import { VertexResultEnum } from "types/graph";
import {
  ValidationDispatchContext,
  ValidationResultsAccumulator,
  ValidationVertexVisitResult,
} from "types/validation";

import { buildValidationError, validateBytesForArtifact } from "./helpers";

export async function validateHardhatLibrary(
  vertex: HardhatLibraryDeploymentVertex,
  _resultAccumulator: ValidationResultsAccumulator,
  { callPoints, services }: ValidationDispatchContext
): Promise<ValidationVertexVisitResult> {
  const invalidBytes = await validateBytesForArtifact({
    vertex,
    callPoints,
    services,
  });

  if (invalidBytes !== null) {
    return invalidBytes;
  }

  const artifactExists = await services.artifacts.hasArtifact(
    vertex.libraryName
  );

  if (!artifactExists) {
    return buildValidationError(
      vertex,
      `Library with name '${vertex.libraryName}' doesn't exist`,
      callPoints
    );
  }

  const artifact = await services.artifacts.getArtifact(vertex.libraryName);
  const argsLength = vertex.args.length;

  const iface = new ethers.utils.Interface(artifact.abi);
  const expectedArgsLength = iface.deploy.inputs.length;

  if (argsLength !== expectedArgsLength) {
    return buildValidationError(
      vertex,
      `The constructor of the library '${vertex.libraryName}' expects ${expectedArgsLength} arguments but ${argsLength} were given`,
      callPoints
    );
  }

  return {
    _kind: VertexResultEnum.SUCCESS,
    result: undefined,
  };
}
