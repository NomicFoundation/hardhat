import { IgnitionValidationError } from "../../../../errors";
import {
  isArtifactType,
  isModuleParameterRuntimeValue,
} from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { DeploymentParameters } from "../../../types/deployer";
import { NamedContractAtFuture } from "../../../types/module";

export async function validateNamedContractAt(
  future: NamedContractAtFuture<string>,
  artifactLoader: ArtifactResolver,
  deploymentParameters: DeploymentParameters
) {
  if (isModuleParameterRuntimeValue(future.address)) {
    const param =
      deploymentParameters[future.address.moduleId]?.[future.address.name] ??
      future.address.defaultValue;
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

  const artifact = await artifactLoader.loadArtifact(future.contractName);

  if (!isArtifactType(artifact)) {
    throw new IgnitionValidationError(
      `Artifact for contract '${future.contractName}' is invalid`
    );
  }
}
