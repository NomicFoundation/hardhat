import {
  DeploymentFuture,
  FunctionCallFuture,
  Future,
  StoredDeployment,
  isDeploymentFuture,
  isFunctionCallFuture,
} from "@ignored/ignition-core/ui-helpers";

export function getFutureById(
  deployment: StoredDeployment,
  futureId: string | undefined
): Future | undefined {
  if (futureId === undefined) {
    return undefined;
  }

  const f = getAllFuturesForModule(deployment.module).find(
    (f) => f.id === futureId
  );

  if (f === undefined) {
    return undefined;
  }

  return f;
}

/* Get all futures in a module and its submodules */
export function getAllFuturesForModule({
  futures,
  submodules,
}: StoredDeployment["module"]): Future[] {
  return Array.from(futures).concat(
    Array.from(submodules.values()).flatMap((submodule) =>
      getAllFuturesForModule(submodule)
    )
  );
}

/**
 * Get all deploy futures in a module and its submodules, including:
 * - hardhat contract deploys
 * - artifact contract deploys
 * - library deploys
 * - artifact library deploys
 */
export function getAllDeployFuturesFor(
  deployment: StoredDeployment
): DeploymentFuture<string>[] {
  return getAllFuturesForModule(deployment.module).filter(isDeploymentFuture);
}

/**
 * Get all calls in a module and its submodules
 */
export function getAllCallFuturesFor(
  deployment: StoredDeployment
): FunctionCallFuture<string, string>[] {
  return getAllFuturesForModule(deployment.module).filter(isFunctionCallFuture);
}
