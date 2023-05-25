import {
  Future,
  FutureType,
  DeploymentFuture,
  FunctionCallFuture,
} from "@ignored/ignition-core/ui-helpers";

export function isFuture(potential: unknown): potential is Future {
  return (
    potential instanceof Object &&
    "type" in potential &&
    typeof potential.type === "number" &&
    FutureType[potential.type] !== undefined
  );
}

export function isDeploymentFuture(f: Future): f is DeploymentFuture<string> {
  const deployFutureTypeIds = [
    FutureType.NAMED_CONTRACT_DEPLOYMENT,
    FutureType.ARTIFACT_CONTRACT_DEPLOYMENT,
    FutureType.NAMED_LIBRARY_DEPLOYMENT,
    FutureType.ARTIFACT_LIBRARY_DEPLOYMENT,
  ];

  return deployFutureTypeIds.includes(f.type);
}

export function isFunctionCallFuture(
  f: Future
): f is FunctionCallFuture<string, string> {
  const callFutureIds = [
    FutureType.NAMED_CONTRACT_CALL,
    FutureType.NAMED_STATIC_CALL,
  ];

  return callFutureIds.includes(f.type);
}
