import {
  isAccountRuntimeValue,
  isModuleParameterRuntimeValue,
} from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { DeploymentParameters } from "../../../types/deploy";
import { SendDataFuture } from "../../../types/module";
import { validateAccountRuntimeValue } from "../utils";

export async function validateSendData(
  future: SendDataFuture,
  _artifactLoader: ArtifactResolver,
  deploymentParameters: DeploymentParameters,
  accounts: string[]
): Promise<string[]> {
  const errors: string[] = [];

  /* stage two */

  const accountParams = [
    ...(isAccountRuntimeValue(future.from) ? [future.from] : []),
    ...(isAccountRuntimeValue(future.to) ? [future.to] : []),
  ];

  errors.push(
    ...accountParams.flatMap((arv) =>
      validateAccountRuntimeValue(arv, accounts)
    )
  );

  if (isModuleParameterRuntimeValue(future.to)) {
    const param =
      deploymentParameters[future.to.moduleId]?.[future.to.name] ??
      future.to.defaultValue;
    if (param === undefined) {
      errors.push(
        `Module parameter '${future.to.name}' requires a value but was given none`
      );
    } else if (typeof param !== "string") {
      errors.push(
        `Module parameter '${
          future.to.name
        }' must be of type 'string' but is '${typeof param}'`
      );
    }
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
