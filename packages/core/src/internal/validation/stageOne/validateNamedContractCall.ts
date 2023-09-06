import { IgnitionValidationError } from "../../../errors";
import { isArtifactType } from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { NamedContractCallFuture } from "../../../types/module";
import {
  validateArtifactFunction,
  validateArtifactFunctionName,
} from "../../new-execution/abi";

export async function validateNamedContractCall(
  future: NamedContractCallFuture<string, string>,
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

  validateArtifactFunctionName(artifact, future.functionName);

  validateArtifactFunction(
    artifact,
    future.contract.contractName,
    future.functionName,
    future.args,
    false
  );
}
