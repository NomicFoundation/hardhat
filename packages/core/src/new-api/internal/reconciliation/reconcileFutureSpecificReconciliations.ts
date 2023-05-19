import {
  CallExecutionState,
  ContractAtExecutionState,
  DeploymentExecutionState,
  ExecutionState,
  ReadEventArgumentExecutionState,
  SendDataExecutionState,
  StaticCallExecutionState,
} from "../../types/execution-state";
import { Future, FutureType } from "../../types/module";

import { reconcileArtifactContractAt } from "./futures/reconcileArtifactContractAt";
import { reconcileArtifactContractDeployment } from "./futures/reconcileArtifactContractDeployment";
import { reconcileArtifactLibraryDeployment } from "./futures/reconcileArtifactLibraryDeployment";
import { reconcileNamedContractAt } from "./futures/reconcileNamedContractAt";
import { reconcileNamedContractCall } from "./futures/reconcileNamedContractCall";
import { reconcileNamedContractDeployment } from "./futures/reconcileNamedContractDeployment";
import { reconcileNamedLibraryDeployment } from "./futures/reconcileNamedLibraryDeployment";
import { reconcileNamedStaticCall } from "./futures/reconcileNamedStaticCall";
import { reconcileReadEventArgument } from "./futures/reconcileReadEventArgument";
import { reconcileSendData } from "./futures/reconcileSendData";
import { ReconciliationContext, ReconciliationFutureResult } from "./types";

export function reconcileFutureSpecificReconciliations(
  future: Future,
  executionState: ExecutionState,
  context: ReconciliationContext
): ReconciliationFutureResult {
  switch (future.type) {
    case FutureType.NAMED_CONTRACT_DEPLOYMENT:
      return reconcileNamedContractDeployment(
        future,
        executionState as DeploymentExecutionState,
        context
      );
    case FutureType.ARTIFACT_CONTRACT_DEPLOYMENT:
      return reconcileArtifactContractDeployment(
        future,
        executionState as DeploymentExecutionState,
        context
      );
    case FutureType.NAMED_LIBRARY_DEPLOYMENT:
      return reconcileNamedLibraryDeployment(
        future,
        executionState as DeploymentExecutionState,
        context
      );
    case FutureType.ARTIFACT_LIBRARY_DEPLOYMENT:
      return reconcileArtifactLibraryDeployment(
        future,
        executionState as DeploymentExecutionState,
        context
      );
    case FutureType.NAMED_CONTRACT_CALL:
      return reconcileNamedContractCall(
        future,
        executionState as CallExecutionState,
        context
      );
    case FutureType.NAMED_STATIC_CALL:
      return reconcileNamedStaticCall(
        future,
        executionState as StaticCallExecutionState,
        context
      );
    case FutureType.NAMED_CONTRACT_AT:
      return reconcileNamedContractAt(
        future,
        executionState as ContractAtExecutionState,
        context
      );
    case FutureType.ARTIFACT_CONTRACT_AT: {
      return reconcileArtifactContractAt(
        future,
        executionState as ContractAtExecutionState,
        context
      );
    }
    case FutureType.READ_EVENT_ARGUMENT: {
      return reconcileReadEventArgument(
        future,
        executionState as ReadEventArgumentExecutionState,
        context
      );
    }
    case FutureType.SEND_DATA: {
      return reconcileSendData(
        future,
        executionState as SendDataExecutionState,
        context
      );
    }
  }
}
