import { ethers } from "ethers";

import { Services } from "services/types";
import { EventVertex } from "types/deploymentGraph";
import { VertexResultEnum } from "types/graph";
import {
  ValidationResultsAccumulator,
  ValidationVertexVisitResult,
} from "types/validation";
import { IgnitionError } from "utils/errors";

import {
  resolveArtifactForCallableFuture,
  validateBytesForArtifact,
} from "./helpers";

export async function validateEvent(
  vertex: EventVertex,
  _resultAccumulator: ValidationResultsAccumulator,
  context: { services: Services }
): Promise<ValidationVertexVisitResult> {
  const invalidBytes = await validateBytesForArtifact(
    vertex.args,
    context.services
  );

  if (invalidBytes !== null) {
    return invalidBytes;
  }

  let artifactAbi: any[] | undefined;
  if (typeof vertex.address === "string") {
    if (!ethers.utils.isAddress(vertex.address)) {
      return {
        _kind: VertexResultEnum.FAILURE,
        failure: new IgnitionError(`Invalid address ${vertex.address}`),
      };
    }

    artifactAbi = vertex.abi;
  } else if (vertex.address.type === "contract") {
    artifactAbi = await resolveArtifactForCallableFuture(
      vertex.address,
      context
    );

    if (artifactAbi === undefined) {
      return {
        _kind: VertexResultEnum.FAILURE,
        failure: new IgnitionError(
          `Artifact with name '${vertex.address.label}' doesn't exist`
        ),
      };
    }
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
      _kind: VertexResultEnum.FAILURE,
      failure: new IgnitionError(
        `Contract '${contractName}' doesn't have an event ${vertex.event}`
      ),
    };
  }

  const matchingEventFragments = eventFragments.filter(
    (f) => f.inputs.length >= argsLength
  );

  if (matchingEventFragments.length === 0) {
    if (eventFragments.length === 1) {
      const contractName = vertex.label.split("/")[0];

      return {
        _kind: VertexResultEnum.FAILURE,
        failure: new IgnitionError(
          `Event ${vertex.event} in contract ${contractName} expects ${eventFragments[0].inputs.length} arguments but ${argsLength} were given`
        ),
      };
    } else {
      return {
        _kind: VertexResultEnum.FAILURE,
        failure: new IgnitionError(
          `Event ${vertex.event} in contract is overloaded, but no overload expects ${argsLength} arguments`
        ),
      };
    }
  }

  return {
    _kind: VertexResultEnum.SUCCESS,
    result: undefined,
  };
}
