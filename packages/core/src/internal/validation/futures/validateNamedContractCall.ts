import {
  isAccountRuntimeValue,
  isArtifactType,
  isModuleParameterRuntimeValue,
} from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { DeploymentParameters } from "../../../types/deploy";
import { ContractCallFuture } from "../../../types/module";
import { validateArtifactFunction } from "../../execution/abi";
import {
  retrieveNestedRuntimeValues,
  validateAccountRuntimeValue,
} from "../utils";

export async function validateNamedContractCall(
  future: ContractCallFuture<string, string>,
  artifactLoader: ArtifactResolver,
  deploymentParameters: DeploymentParameters,
  accounts: string[]
): Promise<string[]> {
  const errors: string[] = [];

  /* stage one */

  const artifact =
    "artifact" in future.contract
      ? future.contract.artifact
      : await artifactLoader.loadArtifact(future.contract.contractName);

  if (!isArtifactType(artifact)) {
    errors.push(
      `Artifact for contract '${future.contract.contractName}' is invalid`
    );
  } else {
    errors.push(
      ...validateArtifactFunction(
        artifact,
        future.contract.contractName,
        future.functionName,
        future.args,
        false
      )
    );
  }

  /* stage two */

  const runtimeValues = retrieveNestedRuntimeValues(future.args);
  const moduleParams = runtimeValues.filter(isModuleParameterRuntimeValue);
  const accountParams = [
    ...runtimeValues.filter(isAccountRuntimeValue),
    ...(isAccountRuntimeValue(future.from) ? [future.from] : []),
  ];

  errors.push(
    ...accountParams.flatMap((arv) =>
      validateAccountRuntimeValue(arv, accounts)
    )
  );

  const missingParams = moduleParams.filter(
    (param) =>
      deploymentParameters[param.moduleId]?.[param.name] === undefined &&
      param.defaultValue === undefined
  );

  if (missingParams.length > 0) {
    errors.push(
      `Module parameter '${missingParams[0].name}' requires a value but was given none`
    );
  }

  if (isModuleParameterRuntimeValue(future.value)) {
    const param =
      deploymentParameters[future.value.moduleId]?.[future.value.name] ??
      future.value.defaultValue;
    if (param === undefined) {
      errors.push(
        `Module parameter '${future.value.name}' requires a value but was given none`
      );
    } else if (typeof param !== "bigint") {
      errors.push(
        `Module parameter '${
          future.value.name
        }' must be of type 'bigint' but is '${typeof param}'`
      );
    }
  }

  return errors;
}
