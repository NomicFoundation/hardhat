import {
  isAccountRuntimeValue,
  isArtifactType,
  isModuleParameterRuntimeValue,
} from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { DeploymentParameters } from "../../../types/deploy";
import { NamedArtifactContractDeploymentFuture } from "../../../types/module";
import { validateContractConstructorArgsLength } from "../../execution/abi";
import { validateLibraryNames } from "../../execution/libraries";
import {
  retrieveNestedRuntimeValues,
  validateAccountRuntimeValue,
} from "../utils";

export async function validateNamedContractDeployment(
  future: NamedArtifactContractDeploymentFuture<string>,
  artifactLoader: ArtifactResolver,
  deploymentParameters: DeploymentParameters,
  accounts: string[]
): Promise<string[]> {
  const errors: string[] = [];

  /* stage one */

  const artifact = await artifactLoader.loadArtifact(future.contractName);

  if (!isArtifactType(artifact)) {
    errors.push(`Artifact for contract '${future.contractName}' is invalid`);
  } else {
    errors.push(
      ...validateLibraryNames(artifact, Object.keys(future.libraries))
    );

    errors.push(
      ...validateContractConstructorArgsLength(
        artifact,
        future.contractName,
        future.constructorArgs
      )
    );
  }

  /* stage two */

  const runtimeValues = retrieveNestedRuntimeValues(future.constructorArgs);
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
