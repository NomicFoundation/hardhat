import { Future, FutureType } from "@ignored/ignition-core/ui-helpers";
import { UiCallFuture, UiContractFuture, UiFuture } from "../types";

export function isUiFuture(f: Future<unknown>): f is UiFuture {
  return FutureType[f.type] !== undefined;
}

export function isContractFuture(f: Future<unknown>): f is UiContractFuture {
  const deployFutureTypeIds = [
    FutureType.NAMED_CONTRACT_DEPLOYMENT,
    FutureType.ARTIFACT_CONTRACT_DEPLOYMENT,
    FutureType.NAMED_LIBRARY_DEPLOYMENT,
    FutureType.ARTIFACT_LIBRARY_DEPLOYMENT,
  ];

  return deployFutureTypeIds.includes(f.type);
}

export function isCallFuture(f: Future<unknown>): f is UiCallFuture {
  const callFutureIds = [
    FutureType.NAMED_CONTRACT_CALL,
    FutureType.NAMED_STATIC_CALL,
  ];

  return callFutureIds.includes(f.type);
}
