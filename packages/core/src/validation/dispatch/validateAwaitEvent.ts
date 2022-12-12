import { ethers } from "ethers";

import { Services } from "services/types";
import { EventVertex } from "types/deploymentGraph";
import { ResultsAccumulator, VertexVisitResult } from "types/graph";

import {
  resolveArtifactForCallableFuture,
  validateBytesForArtifact,
} from "./helpers";

export async function validateAwaitEvent(
  vertex: EventVertex,
  _resultAccumulator: ResultsAccumulator,
  context: { services: Services }
): Promise<VertexVisitResult> {
  const invalidBytes = await validateBytesForArtifact(
    vertex.args,
    context.services
  );

  if (invalidBytes !== null) {
    return invalidBytes;
  }

  let artifactAbi: any[] | undefined;
  if (typeof vertex.address !== "string") {
    artifactAbi = await resolveArtifactForCallableFuture(
      vertex.address,
      context
    );

    if (artifactAbi === undefined) {
      return {
        _kind: "failure",
        failure: new Error(
          `Artifact with name '${vertex.address.label}' doesn't exist`
        ),
      };
    }
  } else if (!ethers.utils.isAddress(vertex.address)) {
    return {
      _kind: "failure",
      failure: new Error(`Invalid address ${vertex.address}`),
    };
  }

  const argsLength = vertex.args.length;

  const iface = new ethers.utils.Interface(artifactAbi ?? vertex.abi);

  const events = Object.entries(iface.events)
    .filter(([fname]) => fname === vertex.event)
    .map(([, fragment]) => fragment);

  const eventFragments = iface.fragments
    .filter((frag) => frag.name === vertex.event)
    .concat(events);

  if (eventFragments.length === 0) {
    const contractName = vertex.label.split("/")[0];

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
      const contractName = vertex.label.split("/")[0];

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
          `Event ${vertex.event} in contract is overloaded, but no overload expects ${argsLength} arguments`
        ),
      };
    }
  }

  return {
    _kind: "success",
    result: undefined,
  };
}
