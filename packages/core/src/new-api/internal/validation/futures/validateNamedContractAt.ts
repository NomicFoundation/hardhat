import { IgnitionValidationError } from "../../../../errors";
import {
  isArtifactType,
  isModuleParameterRuntimeValue,
} from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { ModuleParameters, NamedContractAtFuture } from "../../../types/module";

export async function validateNamedContractAt(
  future: NamedContractAtFuture<string>,
  artifactLoader: ArtifactResolver,
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

  const artifact = await artifactLoader.loadArtifact(future.contractName);

  if (!isArtifactType(artifact)) {
    throw new IgnitionValidationError(
      `Artifact for contract '${future.contractName}' is invalid`
    );
  }
}
