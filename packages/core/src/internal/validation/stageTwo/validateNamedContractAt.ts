import {
  isArtifactType,
  isModuleParameterRuntimeValue,
} from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { DeploymentParameters } from "../../../types/deploy";
import { NamedArtifactContractAtFuture } from "../../../types/module";

export async function validateNamedContractAt(
  future: NamedArtifactContractAtFuture<string>,
  artifactLoader: ArtifactResolver,
  deploymentParameters: DeploymentParameters,
  _accounts: string[]
): Promise<string[]> {
  const errors: string[] = [];

  /* stage one */

  const artifact = await artifactLoader.loadArtifact(future.contractName);

  if (!isArtifactType(artifact)) {
    errors.push(`Artifact for contract '${future.contractName}' is invalid`);
  }

  /* stage two */

  if (isModuleParameterRuntimeValue(future.address)) {
    const param =
      deploymentParameters[future.address.moduleId]?.[future.address.name] ??
      future.address.defaultValue;
    if (param === undefined) {
      errors.push(
        `Module parameter '${future.address.name}' requires a value but was given none`
      );
    } else if (typeof param !== "string") {
      errors.push(
        `Module parameter '${
          future.address.name
        }' must be of type 'string' but is '${typeof param}'`
      );
    }
  }

  return errors;
}
