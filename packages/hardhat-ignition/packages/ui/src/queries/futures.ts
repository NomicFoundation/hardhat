import {
  DeploymentFuture,
  FunctionCallFuture,
  Future,
  IgnitionModule,
  IgnitionModuleResult,
  isDeploymentFuture,
  isFunctionCallFuture,
} from "@nomicfoundation/ignition-core/ui-helpers";

export function getFutureById(
  ignitionModule: IgnitionModule<string, string, IgnitionModuleResult<string>>,
  futureId: string | undefined
): Future | undefined {
  if (futureId === undefined) {
    return undefined;
  }

  const f = getAllFuturesForModule(ignitionModule).find(
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
}: IgnitionModule<string, string, IgnitionModuleResult<string>>): Future[] {
  return Array.from(futures)
    .concat(
      Array.from(submodules.values()).flatMap((submodule) =>
        getAllFuturesForModule(submodule)
      )
    )
    .filter((v, i, a) => a.indexOf(v) === i); // remove duplicates
}

/**
 * Get all deploy futures in a module and its submodules, including:
 * - hardhat contract deploys
 * - artifact contract deploys
 * - library deploys
 * - artifact library deploys
 */
export function getAllDeployFuturesFor(
  ignitionModule: IgnitionModule<string, string, IgnitionModuleResult<string>>
): DeploymentFuture<string>[] {
  return getAllFuturesForModule(ignitionModule).filter(isDeploymentFuture);
}

/**
 * Get all calls in a module and its submodules
 */
export function getAllCallFuturesFor(
  ignitionModule: IgnitionModule<string, string, IgnitionModuleResult<string>>
): FunctionCallFuture<string, string>[] {
  return getAllFuturesForModule(ignitionModule).filter(isFunctionCallFuture);
}
