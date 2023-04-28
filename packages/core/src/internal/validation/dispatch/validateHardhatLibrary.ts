import { ethers } from "ethers";

import { HardhatLibraryDeploymentVertex } from "../../types/deploymentGraph";
import { VertexResultEnum } from "../../types/graph";
import {
  ValidationDispatchContext,
  ValidationResultsAccumulator,
  ValidationVertexVisitResult,
} from "../../types/validation";

import { buildValidationError } from "./helpers";

export async function validateHardhatLibrary(
  vertex: HardhatLibraryDeploymentVertex,
  _resultAccumulator: ValidationResultsAccumulator,
  { callPoints, services }: ValidationDispatchContext
): Promise<ValidationVertexVisitResult> {
  if (!ethers.utils.isAddress(vertex.from)) {
    return buildValidationError(
      vertex,
      `For library 'from' must be a valid address string`,
      callPoints
    );
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

  return {
    _kind: VertexResultEnum.SUCCESS,
    result: undefined,
  };
}
