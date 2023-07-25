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
    const param =
      moduleParameters[future.address.name] ?? future.address.defaultValue;
    if (param === undefined) {
      throw new IgnitionValidationError(
        `Module parameter '${future.address.name}' requires a value but was given none`
      );
    } else if (typeof param !== "string") {
      throw new IgnitionValidationError(
        `Module parameter '${
          future.address.name
        }' must be of type 'string' but is '${typeof param}'`
      );
    }
  }

  return;
}
