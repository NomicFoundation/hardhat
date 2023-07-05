import { IgnitionValidationError } from "../../../../errors";
import { isModuleParameterRuntimeValue } from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { ModuleParameters, SendDataFuture } from "../../../types/module";

export async function validateSendData(
  future: SendDataFuture,
  _artifactLoader: ArtifactResolver,
  moduleParameters: ModuleParameters
) {
  if (isModuleParameterRuntimeValue(future.to)) {
    if (
      moduleParameters[future.to.name] === undefined &&
      future.to.defaultValue === undefined
    ) {
      throw new IgnitionValidationError(
        `Module parameter '${future.to.name}' requires a value but was given none`
      );
    }
  }

  return;
}
