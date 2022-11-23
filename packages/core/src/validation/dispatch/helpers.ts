import type { Services } from "services/types";
import type { CallableFuture } from "types/future";
import { resolveProxyValue } from "utils/proxy";

export async function resolveArtifactForCallableFuture(
  givenFuture: CallableFuture,
  { services }: { services: Services }
): Promise<any[] | undefined> {
  const future = resolveProxyValue(givenFuture);

  switch (future.type) {
    case "contract":
      switch (future.subtype) {
        case "artifact":
          return future.artifact.abi;
        case "deployed":
          return future.abi;
        case "hardhat":
          const artifact = await services.artifacts.getArtifact(
            future.contractName
          );
          return artifact.abi;
        default:
          return assertNeverDeploymentFuture(future);
      }
    case "library":
      switch (future.subtype) {
        case "artifact":
          return future.artifact.abi;
        case "hardhat":
          const artifact = await services.artifacts.getArtifact(
            future.libraryName
          );
          return artifact.abi;
        default:
          return assertNeverDeploymentFuture(future);
      }
    case "virtual":
      throw new Error(`Cannot call virtual future`);
    case "call":
      throw new Error(`Cannot call call future`);
    case "await":
      throw new Error(`Cannot call await future`);
    default:
      return assertNeverDeploymentFuture(future);
  }
}

function assertNeverDeploymentFuture(f: never): undefined {
  throw new Error(
    `Unexpected deployment future type/subtype ${JSON.stringify(f)}`
  );
}
