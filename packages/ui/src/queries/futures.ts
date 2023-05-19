import { StoredDeployment } from "@ignored/ignition-core/ui-helpers";
import { UiContractFuture, UiFuture } from "../types";
import { isCallFuture, isContractFuture, isUiFuture } from "../utils/guards";

export function getFutureById(
  deployment: StoredDeployment,
  futureId: string | undefined
): UiFuture | undefined {
  if (futureId === undefined) {
    return undefined;
  }

  const f = getAllFuturesForModule(deployment.module).find(
    (f) => f.id === futureId
  );

  if (f === undefined) {
    return undefined;
  }

  if (!isUiFuture(f)) {
    throw new Error("Not a future");
  }

  return f;
}

/* Get all futures in a module and its submodules */
export function getAllFuturesForModule({
  futures,
  submodules,
}: StoredDeployment["module"]): UiFuture[] {
  return Array.from(futures)
    .filter(isUiFuture)
    .concat(
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
): UiContractFuture[] {
  return getAllFuturesForModule(deployment.module).filter(isContractFuture);
}

/**
 * Get all calls in a module and its submodules
 */
export function getAllCallFuturesFor(deployment: StoredDeployment): UiFuture[] {
  return getAllFuturesForModule(deployment.module).filter(isCallFuture);
}
