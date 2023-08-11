import {
  NetworkInteraction,
  NetworkInteractionType,
  OnchainInteraction,
  StaticCall,
} from "../types/network-interaction";

export function isNetworkInteraction(
  potential: unknown
): potential is NetworkInteraction {
  return isOnchainInteraction(potential) || isStaticCall(potential);
}

export function isOnchainInteraction(
  potential: unknown
): potential is OnchainInteraction {
  return (
    _isNetworkInteraction(potential) &&
    potential.type === NetworkInteractionType.ONCHAIN_INTERACTION
  );
}

export function isStaticCall(potential: unknown): potential is StaticCall {
  return (
    _isNetworkInteraction(potential) &&
    potential.type === NetworkInteractionType.STATIC_CALL
  );
}

function _isNetworkInteraction(
  potential: unknown
): potential is NetworkInteraction {
  return (
    potential !== undefined &&
    potential !== null &&
    typeof potential === "object" &&
    "type" in potential
  );
}
