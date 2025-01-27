import type { ArtifactResolver } from "../../../types/artifact.js";
import type { DeploymentParameters } from "../../../types/deploy.js";
import type { NamedArtifactContractDeploymentFuture } from "../../../types/module.js";

import { IgnitionError } from "../../../errors.js";
import {
  isAccountRuntimeValue,
  isArtifactType,
  isModuleParameterRuntimeValue,
} from "../../../type-guards.js";
import { ERRORS } from "../../errors-list.js";
import { validateContractConstructorArgsLength } from "../../execution/abi.js";
import { validateLibraryNames } from "../../execution/libraries.js";
import {
  filterToAccountRuntimeValues,
  resolvePotentialModuleParameterValueFrom,
  retrieveNestedRuntimeValues,
  validateAccountRuntimeValue,
} from "../utils.js";

export async function validateNamedContractDeployment(
  future: NamedArtifactContractDeploymentFuture<string>,
  artifactLoader: ArtifactResolver,
  deploymentParameters: DeploymentParameters,
  accounts: string[],
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
  } else {
    errors.push(
      ...validateLibraryNames(artifact, Object.keys(future.libraries)),
    );

    errors.push(
      ...validateContractConstructorArgsLength(
        artifact,
        future.contractName,
        future.constructorArgs,
      ),
    );
  }

  /* stage two */

  const runtimeValues = retrieveNestedRuntimeValues(future.constructorArgs);
  const moduleParams = runtimeValues.filter(isModuleParameterRuntimeValue);
  const accountParams = [
    ...filterToAccountRuntimeValues(runtimeValues),
    ...(isAccountRuntimeValue(future.from) ? [future.from] : []),
  ];

  errors.push(
    ...accountParams.flatMap((arv) =>
      validateAccountRuntimeValue(arv, accounts),
    ),
  );

  const missingParams = moduleParams.filter(
    (param) =>
      resolvePotentialModuleParameterValueFrom(deploymentParameters, param) ===
      undefined,
  );

  if (missingParams.length > 0) {
    errors.push(
      new IgnitionError(ERRORS.VALIDATION.MISSING_MODULE_PARAMETER, {
        name: missingParams[0].name,
      }),
    );
  }

  if (isModuleParameterRuntimeValue(future.value)) {
    const param = resolvePotentialModuleParameterValueFrom(
      deploymentParameters,
      future.value,
    );

    if (param === undefined) {
      errors.push(
        new IgnitionError(ERRORS.VALIDATION.MISSING_MODULE_PARAMETER, {
          name: future.value.name,
        }),
      );
    } else if (typeof param !== "bigint") {
      errors.push(
        new IgnitionError(ERRORS.VALIDATION.INVALID_MODULE_PARAMETER_TYPE, {
          name: future.value.name,
          expectedType: "bigint",
          actualType: typeof param,
        }),
      );
    }
  }

  return errors.map((e) => e.message);
}
