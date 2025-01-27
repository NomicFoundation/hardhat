import type {
  ReconciliationContext,
  ReconciliationFutureResult,
} from "./types";
import type { Future } from "../../types/module";
import type {
  CallExecutionState,
  ContractAtExecutionState,
  DeploymentExecutionState,
  EncodeFunctionCallExecutionState,
  ExecutionState,
  ReadEventArgumentExecutionState,
  SendDataExecutionState,
  StaticCallExecutionState,
} from "../execution/types/execution-state";

import { FutureType } from "../../types/module";

import { reconcileArtifactContractAt } from "./futures/reconcileArtifactContractAt";
import { reconcileArtifactContractDeployment } from "./futures/reconcileArtifactContractDeployment";
import { reconcileArtifactLibraryDeployment } from "./futures/reconcileArtifactLibraryDeployment";
import { reconcileNamedContractAt } from "./futures/reconcileNamedContractAt";
import { reconcileNamedContractCall } from "./futures/reconcileNamedContractCall";
import { reconcileNamedContractDeployment } from "./futures/reconcileNamedContractDeployment";
import { reconcileNamedEncodeFunctionCall } from "./futures/reconcileNamedEncodeFunctionCall";
import { reconcileNamedLibraryDeployment } from "./futures/reconcileNamedLibraryDeployment";
import { reconcileNamedStaticCall } from "./futures/reconcileNamedStaticCall";
import { reconcileReadEventArgument } from "./futures/reconcileReadEventArgument";
import { reconcileSendData } from "./futures/reconcileSendData";

export async function reconcileFutureSpecificReconciliations(
  future: Future,
  executionState: ExecutionState,
  context: ReconciliationContext,
): Promise<ReconciliationFutureResult> {
  switch (future.type) {
    case FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT:
      return reconcileNamedContractDeployment(
        future,
        executionState as DeploymentExecutionState,
        context,
      );
    case FutureType.CONTRACT_DEPLOYMENT:
      return reconcileArtifactContractDeployment(
        future,
        executionState as DeploymentExecutionState,
        context,
      );
    case FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT:
      return reconcileNamedLibraryDeployment(
        future,
        executionState as DeploymentExecutionState,
        context,
      );
    case FutureType.LIBRARY_DEPLOYMENT:
      return reconcileArtifactLibraryDeployment(
        future,
        executionState as DeploymentExecutionState,
        context,
      );
    case FutureType.CONTRACT_CALL:
      return reconcileNamedContractCall(
        future,
        executionState as CallExecutionState,
        context,
      );
    case FutureType.STATIC_CALL:
      return reconcileNamedStaticCall(
        future,
        executionState as StaticCallExecutionState,
        context,
      );
    case FutureType.ENCODE_FUNCTION_CALL:
      return reconcileNamedEncodeFunctionCall(
        future,
        executionState as EncodeFunctionCallExecutionState,
        context,
      );
    case FutureType.NAMED_ARTIFACT_CONTRACT_AT:
      return reconcileNamedContractAt(
        future,
        executionState as ContractAtExecutionState,
        context,
      );
    case FutureType.CONTRACT_AT: {
      return reconcileArtifactContractAt(
        future,
        executionState as ContractAtExecutionState,
        context,
      );
    }
    case FutureType.READ_EVENT_ARGUMENT: {
      return reconcileReadEventArgument(
        future,
        executionState as ReadEventArgumentExecutionState,
        context,
      );
    }
    case FutureType.SEND_DATA: {
      return reconcileSendData(
        future,
        executionState as SendDataExecutionState,
        context,
      );
    }
  }
}
