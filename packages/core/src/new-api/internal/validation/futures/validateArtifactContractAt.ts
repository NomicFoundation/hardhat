import { IgnitionValidationError } from "../../../../errors";
import { isModuleParameterRuntimeValue } from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import {
  ArtifactContractAtFuture,
  ModuleParameters,
} from "../../../types/module";

export async function validateArtifactContractAt(
  future: ArtifactContractAtFuture,
  _artifactLoader: ArtifactResolver,
  moduleParameters: ModuleParameters
) {
  if (isModuleParameterRuntimeValue(future.address)) {
    if (
      moduleParameters[future.address.name] === undefined &&
      future.address.defaultValue === undefined
    ) {
      throw new IgnitionValidationError(
        `Module parameter '${future.address.name}' requires a value but was given none`
      );
    }
  }

  return;
}
