import type { Services } from "../../types/services";

import { IgnitionError } from "../../../errors";
import { ContractFutureOld } from "../../../types/future";
import { CallPoints, DeploymentGraphVertex } from "../../types/deploymentGraph";
import { VertexResultEnum, VertexVisitResultFailure } from "../../types/graph";
import { resolveProxyValue } from "../../utils/proxy";

export async function resolveArtifactForContractFuture(
  givenFuture: ContractFutureOld,
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
      }
    case "virtual":
      throw new IgnitionError(`Cannot call virtual future`);
    case "call":
      throw new IgnitionError(`Cannot call call future`);
    case "static-call":
      throw new IgnitionError(`Cannot call static-call future`);
    case "await":
      throw new IgnitionError(`Cannot call await future`);
    case "send":
      throw new IgnitionError(`Cannot call send future`);
  }
}

export function buildValidationError(
  vertex: DeploymentGraphVertex,
  message: string,
  callPoints: CallPoints
): VertexVisitResultFailure {
  const failure = callPoints[vertex.id] ?? new IgnitionError("-");

  failure.message = message;

  return {
    _kind: VertexResultEnum.FAILURE,
    failure,
  };
}
