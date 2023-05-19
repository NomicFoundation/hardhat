import type {
  ContractFutureOld,
  DependableFuture,
  DeploymentGraphFuture,
  EventParamFuture,
  OptionalParameter,
  ProxyFuture,
  RequiredParameter,
  StaticContractCall,
  Virtual,
} from "../../types/future";
import type {
  ArtifactContractDeploymentVertex,
  ArtifactLibraryDeploymentVertex,
  CallDeploymentVertex,
  DeployedContractDeploymentVertex,
  DeploymentGraphVertex,
  EventVertex,
  HardhatContractDeploymentVertex,
  HardhatLibraryDeploymentVertex,
  StaticCallDeploymentVertex,
} from "../types/deploymentGraph";

import { IgnitionError } from "../../errors";
import {
  DeploymentExecutionState,
  ExecutionState,
  StaticCallExecutionState,
} from "../../new-api/types/execution-state";
import { FutureType } from "../../new-api/types/module";
import { ArtifactOld } from "../../types/hardhat";
import { ModuleDict } from "../../types/module";

export function isArtifact(artifact: any): artifact is ArtifactOld {
  return (
    artifact !== null &&
    artifact !== undefined &&
    artifact.bytecode &&
    artifact.abi
  );
}

export function isHardhatContract(
  node: DeploymentGraphVertex
): node is HardhatContractDeploymentVertex {
  return node.type === "HardhatContract";
}

export function isArtifactContract(
  node: DeploymentGraphVertex
): node is ArtifactContractDeploymentVertex {
  return node.type === "ArtifactContract";
}

export function isDeployedContract(
  node: DeploymentGraphVertex
): node is DeployedContractDeploymentVertex {
  return node.type === "DeployedContract";
}

export function isCall(
  node: DeploymentGraphVertex
): node is CallDeploymentVertex {
  return node.type === "Call";
}

export function isStaticCall(
  node: DeploymentGraphVertex
): node is StaticCallDeploymentVertex {
  return node.type === "StaticCall";
}

export function isAwaitedEvent(
  node: DeploymentGraphVertex
): node is EventVertex {
  return node.type === "Event";
}

export function isHardhatLibrary(
  node: DeploymentGraphVertex
): node is HardhatLibraryDeploymentVertex {
  return node.type === "HardhatLibrary";
}

export function isArtifactLibrary(
  node: DeploymentGraphVertex
): node is ArtifactLibraryDeploymentVertex {
  return node.type === "ArtifactLibrary";
}

export function isFuture(possible: {}): possible is DeploymentGraphFuture {
  return (
    possible !== undefined &&
    possible !== null &&
    typeof possible === "object" &&
    "_future" in possible
  );
}

export function isDependable(possible: any): possible is DependableFuture {
  return (
    isFuture(possible) &&
    (possible.type === "call" ||
      possible.type === "static-call" ||
      possible.type === "contract" ||
      possible.type === "library" ||
      possible.type === "virtual" ||
      possible.type === "await" ||
      possible.type === "proxy" ||
      possible.type === "send")
  );
}

export function isProxy(possible: any): possible is ProxyFuture {
  return isFuture(possible) && possible.type === "proxy";
}

export function isVirtual(possible: any): possible is Virtual {
  return isFuture(possible) && possible.type === "virtual";
}

export function isEventParam(possible: any): possible is EventParamFuture {
  return isFuture(possible) && possible.type === "eventParam";
}

export function isStaticCallFuture(
  possible: any
): possible is StaticContractCall {
  return isFuture(possible) && possible.type === "static-call";
}

export function isParameter(
  future: DeploymentGraphFuture
): future is RequiredParameter | OptionalParameter {
  return future.type === "parameter";
}

export function isContract(
  future: DeploymentGraphFuture
): future is ContractFutureOld {
  if (isProxy(future)) {
    return isContract(future.value);
  }

  return future.type === "contract";
}

export function isLibrary(
  future: DeploymentGraphFuture
): future is ContractFutureOld {
  if (isProxy(future)) {
    return isLibrary(future.value);
  }

  return future.type === "library";
}

export function isDeploymentExecutionState(
  executionState: ExecutionState
): executionState is DeploymentExecutionState {
  return [
    FutureType.NAMED_CONTRACT_DEPLOYMENT,
    FutureType.ARTIFACT_CONTRACT_DEPLOYMENT,
    FutureType.NAMED_LIBRARY_DEPLOYMENT,
    FutureType.ARTIFACT_LIBRARY_DEPLOYMENT,
  ].includes(executionState.futureType);
}

export function isStaticCallExecutionState(
  executionState: ExecutionState
): executionState is StaticCallExecutionState {
  return [FutureType.NAMED_STATIC_CALL].includes(executionState.futureType);
}

export function assertModuleReturnTypes<T extends ModuleDict>(moduleResult: T) {
  for (const future of Object.values(moduleResult)) {
    if (isContract(future) || isLibrary(future)) {
      continue;
    }

    throw new IgnitionError(
      `Cannot return Future of type "${future.type}" from a module`
    );
  }
}
