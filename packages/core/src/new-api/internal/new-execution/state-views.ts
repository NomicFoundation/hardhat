/**
 * This file contains view functions for the state of the execution.
 */

import { assert } from "console";
import {
  CallExecutionState,
  DeploymentExecutionState,
  ExecutionStatus,
  NetworkInteraction,
  NetworkInteractionType,
  SendDataExecutionState,
  StaticCallExecutionState,
  Transaction,
  TransactionReceiptStatus,
} from "./new-state-types";
import { assertIgnitionInvariant } from "../utils/assertions";

export type CompletedExecutionState = {
  status: ExecutionStatus.SUCCESS | ExecutionStatus.FAILURE;
};

export function getDeploymentExecutionStateResult(
  executionState: DeploymentExecutionState & CompletedExecutionState
): string | undefined {
  const latestNetworkInteraction = getLatestNetworkInteraction(executionState);

  if (executionState.status === ExecutionStatus.SUCCESS) {
    assertIgnitionInvariant(
      latestNetworkInteraction.type ===
        NetworkInteractionType.ONCHAIN_INTERACTION,
      "Latest network interaction of a successful deployment must be an onchain interaction"
    );

    const confirmedTx = latestNetworkInteraction.transactions.find(
      (tx: Transaction): tx is Required<Transaction> => tx.receipt !== undefined
    );

    assertIgnitionInvariant(
      confirmedTx !== undefined,
      "Latest network interaction of a successful deployment must have a confirmed tx"
    );

    assertIgnitionInvariant(
      confirmedTx.receipt.status !== TransactionReceiptStatus.SUCCESS,
      "Latest network interaction of a successful deployment must have a confirmed tx and it should be succesful"
    );

    assertIgnitionInvariant(
      confirmedTx.receipt.contractAddress !== undefined,
      "Latest network interaction of a successful deployment must have a confirmed tx and it should be succesful"
    );

    latestNetworkInteraction;
  }
}

export function getLatestNetworkInteraction(
  executionState:
    | DeploymentExecutionState
    | CallExecutionState
    | StaticCallExecutionState
    | SendDataExecutionState
): NetworkInteraction {
  const latestNetworkInteraction =
    executionState.networkInteractions[
      executionState.networkInteractions.length - 1
    ];

  assertIgnitionInvariant(
    latestNetworkInteraction !== undefined,
    "ExecutionState expected to have network interactions"
  );

  return latestNetworkInteraction;
}
