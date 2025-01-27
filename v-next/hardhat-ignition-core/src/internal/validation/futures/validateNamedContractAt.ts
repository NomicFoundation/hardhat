import { IgnitionError } from "../../../errors";
import {
  isArtifactType,
  isModuleParameterRuntimeValue,
} from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { DeploymentParameters } from "../../../types/deploy";
import { NamedArtifactContractAtFuture } from "../../../types/module";
import { ERRORS } from "../../errors-list";
import { resolvePotentialModuleParameterValueFrom } from "../utils";

export async function validateNamedContractAt(
  future: NamedArtifactContractAtFuture<string>,
  artifactLoader: ArtifactResolver,
  deploymentParameters: DeploymentParameters,
  _accounts: string[],
): Promise<string[]> {
  const errors: IgnitionError[] = [];

  /* stage one */

  const artifact = await artifactLoader.loadArtifact(future.contractName);

  if (!isArtifactType(artifact)) {
    errors.push(
      new IgnitionError(ERRORS.VALIDATION.INVALID_ARTIFACT, {
        contractName: future.contractName,
      }),
    );
  }

  /* stage two */

  if (isModuleParameterRuntimeValue(future.address)) {
    const param = resolvePotentialModuleParameterValueFrom(
      deploymentParameters,
      future.address,
    );

    if (param === undefined) {
      errors.push(
        new IgnitionError(ERRORS.VALIDATION.MISSING_MODULE_PARAMETER, {
          name: future.address.name,
        }),
      );
    } else if (typeof param !== "string") {
      errors.push(
        new IgnitionError(ERRORS.VALIDATION.INVALID_MODULE_PARAMETER_TYPE, {
          name: future.address.name,
          expectedType: "string",
          actualType: typeof param,
        }),
      );
    }
  }

  return errors.map((e) => e.message);
}
