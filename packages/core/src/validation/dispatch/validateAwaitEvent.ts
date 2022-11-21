import { ethers } from "ethers";

import { Services } from "services/types";
import { AwaitVertex } from "types/deploymentGraph";
import { CallableFuture } from "types/future";
import { ResultsAccumulator, VertexVisitResult } from "types/graph";
import { resolveProxyValue } from "utils/proxy";

export async function validateAwaitEvent(
  vertex: AwaitVertex,
  _resultAccumulator: ResultsAccumulator,
  context: { services: Services }
): Promise<VertexVisitResult> {
  const contractName = vertex.contract.label;

  const artifactAbi = await resolveArtifactForCallableFuture(
    vertex.contract,
    context
  );

  if (artifactAbi === undefined) {
    return {
      _kind: "failure",
      failure: new Error(`Artifact with name '${contractName}' doesn't exist`),
    };
  }

  const argsLength = vertex.args.length;

  const iface = new ethers.utils.Interface(artifactAbi);

  const events = Object.entries(iface.events)
    .filter(([fname]) => fname === vertex.event)
    .map(([, fragment]) => fragment);

  const eventFragments = iface.fragments
    .filter((frag) => frag.name === vertex.event)
    .concat(events);

  if (eventFragments.length === 0) {
    return {
      _kind: "failure",
      failure: new Error(
        `Contract '${contractName}' doesn't have an event ${vertex.event}`
      ),
    };
  }

  const matchingEventFragments = eventFragments.filter(
    (f) => f.inputs.length === argsLength
  );

  if (matchingEventFragments.length === 0) {
    if (eventFragments.length === 1) {
      return {
        _kind: "failure",
        failure: new Error(
          `Event ${vertex.event} in contract ${contractName} expects ${eventFragments[0].inputs.length} arguments but ${argsLength} were given`
        ),
      };
    } else {
      return {
        _kind: "failure",
        failure: new Error(
          `Event ${vertex.event} in contract ${contractName} is overloaded, but no overload expects ${argsLength} arguments`
        ),
      };
    }
  }

  return {
    _kind: "success",
    result: undefined,
  };
}

async function resolveArtifactForCallableFuture(
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
