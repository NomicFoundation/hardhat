import type { ArtifactResolver } from "../../../../types/artifact.js";
import type {
  Future,
  NamedArtifactContractAtFuture,
  NamedArtifactContractDeploymentFuture,
  NamedArtifactLibraryDeploymentFuture,
} from "../../../../types/module.js";
import type { DeploymentLoader } from "../../../deployment-loader/types.js";

import { FutureType } from "../../../../types/module.js";

export async function saveArtifactsForFuture(
  future: Future,
  artifactResolver: ArtifactResolver,
  deploymentLoader: DeploymentLoader,
): Promise<void> {
  switch (future.type) {
    case FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT:
    case FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT:
    case FutureType.NAMED_ARTIFACT_CONTRACT_AT:
      return _storeArtifactAndBuildInfoAgainstDeployment(future, {
        artifactResolver,
        deploymentLoader,
      });
    case FutureType.CONTRACT_DEPLOYMENT:
    case FutureType.LIBRARY_DEPLOYMENT:
    case FutureType.CONTRACT_AT:
      return deploymentLoader.storeUserProvidedArtifact(
        future.id,
        future.artifact,
      );
    case FutureType.CONTRACT_CALL:
    case FutureType.STATIC_CALL:
    case FutureType.ENCODE_FUNCTION_CALL:
    case FutureType.READ_EVENT_ARGUMENT:
    case FutureType.SEND_DATA:
      return;
  }
}

async function _storeArtifactAndBuildInfoAgainstDeployment(
  future:
    | NamedArtifactLibraryDeploymentFuture<string>
    | NamedArtifactContractDeploymentFuture<string>
    | NamedArtifactContractAtFuture<string>,
  {
    deploymentLoader,
    artifactResolver,
  }: {
    deploymentLoader: DeploymentLoader;
    artifactResolver: ArtifactResolver;
  },
): Promise<void> {
  const artifact = await artifactResolver.loadArtifact(future.contractName);
  await deploymentLoader.storeNamedArtifact(
    future.id,
    future.contractName,
    artifact,
  );
  const buildInfo = await artifactResolver.getBuildInfo(future.contractName);

  if (buildInfo !== undefined) {
    await deploymentLoader.storeBuildInfo(future.id, buildInfo);
  }
}
