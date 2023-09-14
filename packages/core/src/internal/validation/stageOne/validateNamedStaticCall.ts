import { IgnitionValidationError } from "../../../errors";
import { isArtifactType } from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { StaticCallFuture } from "../../../types/module";
import {
  validateArtifactFunction,
  validateFunctionArgumentParamType,
} from "../../execution/abi";

export async function validateNamedStaticCall(
  future: StaticCallFuture<string, string>,
  artifactLoader: ArtifactResolver
) {
  const artifact =
    "artifact" in future.contract
      ? future.contract.artifact
      : await artifactLoader.loadArtifact(future.contract.contractName);

  if (!isArtifactType(artifact)) {
    throw new IgnitionValidationError(
      `Artifact for contract '${future.contract.contractName}' is invalid`
    );
  }

  validateArtifactFunction(
    artifact,
    future.contract.contractName,
    future.functionName,
    future.args,
    true
  );

  validateFunctionArgumentParamType(
    future.contract.contractName,
    future.functionName,
    artifact,
    future.nameOrIndex
  );
}
