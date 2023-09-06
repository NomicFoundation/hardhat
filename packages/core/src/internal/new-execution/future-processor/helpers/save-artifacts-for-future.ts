import { ArtifactResolver } from "../../../../types/artifact";
import {
  Future,
  FutureType,
  NamedContractAtFuture,
  NamedContractDeploymentFuture,
  NamedLibraryDeploymentFuture,
} from "../../../../types/module";
import { DeploymentLoader } from "../../../deployment-loader/types";

export async function saveArtifactsForFuture(
  future: Future,
  artifactResolver: ArtifactResolver,
  deploymentLoader: DeploymentLoader
): Promise<void> {
  switch (future.type) {
    case FutureType.NAMED_CONTRACT_DEPLOYMENT:
    case FutureType.NAMED_LIBRARY_DEPLOYMENT:
    case FutureType.NAMED_CONTRACT_AT:
      return _storeArtifactAndBuildInfoAgainstDeployment(future, {
        artifactResolver,
        deploymentLoader,
      });
    case FutureType.ARTIFACT_CONTRACT_DEPLOYMENT:
    case FutureType.ARTIFACT_LIBRARY_DEPLOYMENT:
    case FutureType.ARTIFACT_CONTRACT_AT:
      return deploymentLoader.storeUserProvidedArtifact(
        future.id,
        future.artifact
      );
    case FutureType.NAMED_CONTRACT_CALL:
    case FutureType.NAMED_STATIC_CALL:
    case FutureType.READ_EVENT_ARGUMENT:
    case FutureType.SEND_DATA:
      return;
  }
}

async function _storeArtifactAndBuildInfoAgainstDeployment(
  future:
    | NamedLibraryDeploymentFuture<string>
    | NamedContractDeploymentFuture<string>
    | NamedContractAtFuture<string>,
  {
    deploymentLoader,
    artifactResolver,
  }: {
    deploymentLoader: DeploymentLoader;
    artifactResolver: ArtifactResolver;
  }
): Promise<void> {
  const artifact = await artifactResolver.loadArtifact(future.contractName);
  await deploymentLoader.storeNamedArtifact(
    future.id,
    future.contractName,
    artifact
  );
  const buildInfo = await artifactResolver.getBuildInfo(future.contractName);

  if (buildInfo !== undefined) {
    await deploymentLoader.storeBuildInfo(buildInfo);
  }
}
