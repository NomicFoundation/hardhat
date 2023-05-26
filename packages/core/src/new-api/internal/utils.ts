import {
  AddressResolvableFuture,
  ArgumentType,
  ContractFuture,
  Future,
  FutureType,
  RuntimeValue,
  RuntimeValueType,
} from "../types/module";

export function isFutureType(potential: unknown): potential is FutureType {
  return (
    typeof potential === "string" &&
    (FutureType as any)[potential] !== undefined
  );
}

export function isFuture(potential: unknown): potential is Future {
  return (
    typeof potential === "object" &&
    potential !== null &&
    "type" in potential &&
    isFutureType(potential.type)
  );
}

export function isContractFuture(
  future: Future
): future is ContractFuture<string> {
  switch (future.type) {
    case FutureType.NAMED_CONTRACT_DEPLOYMENT:
    case FutureType.ARTIFACT_CONTRACT_DEPLOYMENT:
    case FutureType.NAMED_LIBRARY_DEPLOYMENT:
    case FutureType.ARTIFACT_LIBRARY_DEPLOYMENT:
    case FutureType.NAMED_CONTRACT_AT:
    case FutureType.ARTIFACT_CONTRACT_AT:
      return true;

    default:
      return false;
  }
}

export function isAddressResolvableFuture(
  future: Future
): future is AddressResolvableFuture {
  return (
    isContractFuture(future) ||
    future.type === FutureType.NAMED_STATIC_CALL ||
    future.type === FutureType.READ_EVENT_ARGUMENT
  );
}

export function getFutures(args: ArgumentType[]): Future[] {
  return args.flatMap(_getFutures);
}

function _getFutures(argument: ArgumentType): Future[] {
  if (isFuture(argument)) {
    return [argument];
  }

  if (Array.isArray(argument)) {
    return getFutures(argument);
  }

  if (typeof argument === "object" && argument !== null) {
    return getFutures(Object.values(argument));
  }

  return [];
}

export function isRuntimeValueType(
  potential: unknown
): potential is RuntimeValueType {
  return (
    typeof potential === "string" &&
    (RuntimeValueType as any)[potential] !== undefined
  );
}

export function isRuntimeValue(potential: unknown): potential is RuntimeValue {
  return (
    typeof potential === "object" &&
    potential !== null &&
    "type" in potential &&
    isRuntimeValueType(potential.type)
  );
}
