import type { ArtifactResolver } from "../../../types/artifact.js";
import type { DeploymentParameters } from "../../../types/deploy.js";
import type { ContractCallFuture } from "../../../types/module.js";

import { IgnitionError } from "../../../errors.js";
import {
  isAccountRuntimeValue,
  isArtifactType,
  isModuleParameterRuntimeValue,
} from "../../../type-guards.js";
import { ERRORS } from "../../errors-list.js";
import { validateArtifactFunction } from "../../execution/abi.js";
import {
  filterToAccountRuntimeValues,
  resolvePotentialModuleParameterValueFrom,
  retrieveNestedRuntimeValues,
  validateAccountRuntimeValue,
} from "../utils.js";

export async function validateNamedContractCall(
  future: ContractCallFuture<string, string>,
  artifactLoader: ArtifactResolver,
  deploymentParameters: DeploymentParameters,
  accounts: string[],
): Promise<string[]> {
  const errors: IgnitionError[] = [];

  /* stage one */

  const artifact =
    "artifact" in future.contract
      ? future.contract.artifact
      : await artifactLoader.loadArtifact(future.contract.contractName);

  if (!isArtifactType(artifact)) {
    errors.push(
      new IgnitionError(ERRORS.VALIDATION.INVALID_ARTIFACT, {
        contractName: future.contract.contractName,
      }),
    );
  } else {
    errors.push(
      ...validateArtifactFunction(
        artifact,
        future.contract.contractName,
        future.functionName,
        future.args,
        false,
      ),
    );
  }

  /* stage two */

  const runtimeValues = retrieveNestedRuntimeValues(future.args);
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
