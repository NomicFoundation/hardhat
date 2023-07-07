import { ethers } from "ethers";

import { serializeReplacer } from "../../../helpers";
import {
  CallFunctionInteractionMessage,
  DeployContractInteractionMessage,
  ExecutionFailure,
  ExecutionSuccess,
  OnchainCallFunctionSuccessMessage,
  OnchainContractAtSuccessMessage,
  OnchainDeployContractSuccessMessage,
  OnchainFailureMessage,
  OnchainInteractionMessage,
  OnchainReadEventArgumentSuccessMessage,
  OnchainResultMessage,
  OnchainSendDataSuccessMessage,
  OnchainStaticCallSuccessMessage,
  OnchainTransactionAccept,
  OnchainTransactionRequest,
  ReadEventArgumentInteractionMessage,
  SendDataInteractionMessage,
  StaticCallInteractionMessage,
  TransactionMessage,
} from "../../types/journal";
import { ArgumentType } from "../../types/module";
import {
  isOnChainResultMessage,
  isOnchainFailureMessage,
  isOnchainTransactionAccept,
  isOnchainTransactionRequest,
} from "../journal/type-guards";
import { ExecutionEngineState } from "../types/execution-engine";
import { OnchainStatuses } from "../types/execution-state";
import { assertIgnitionInvariant } from "../utils/assertions";
import { collectLibrariesAndLink } from "../utils/collectLibrariesAndLink";

import {
  isCallFunctionInteraction,
  isContractAtInteraction,
  isDeployContractInteraction,
  isReadEventArgumentInteraction,
  isSendDataInteraction,
  isStaticCallInteraction,
} from "./guards";

export interface OnchainStateTransitionContinue {
  status: "continue";
  next: ExecutionSuccess | ExecutionFailure | TransactionMessage;
}

export interface OnchainStateTransitionPause {
  status: "pause";
}

export type OnchainStateTransition = (
  state: ExecutionEngineState,
  next: TransactionMessage | null,
  strategyInst: AsyncGenerator<
    OnchainInteractionMessage,
    ExecutionSuccess | OnchainInteractionMessage,
    OnchainResultMessage | null
  >
) => Promise<OnchainStateTransitionContinue | OnchainStateTransitionPause>;

export type OnchainStateTransitions = Record<
  OnchainStatuses,
  OnchainStateTransition
>;

const DEFAULT_CONFIRMATIONS = 0;

export const onchainStateTransitions: OnchainStateTransitions = {
  [OnchainStatuses.EXECUTE]: async (_state, next, strategyInst) => {
    assertIgnitionInvariant(
      next === null || isOnChainResultMessage(next),
      `Message not in sync with onchain state - EXECUTE: ${JSON.stringify(
        next
      )}`
    );

    const onchainRequest: OnchainInteractionMessage | ExecutionSuccess = (
      await strategyInst.next(next)
    ).value;

    return { status: "continue", next: onchainRequest };
  },
  [OnchainStatuses.DEPLOY_CONTRACT_START]: async (state, next) => {
    assertIgnitionInvariant(
      next !== null && isDeployContractInteraction(next),
      `Message not in sync with onchain state - DEPLOY_CONTRACT_START: ${JSON.stringify(
        next,
        serializeReplacer
      )}`
    );

    const nonce = await state.chainDispatcher.allocateNextNonceForAccount(
      next.from
    );

    const tx = await _convertRequestToDeployTransaction(next, state);
    tx.nonce = nonce;

    const onchainTransaction: OnchainTransactionRequest = {
      type: "onchain-transaction-request",
      futureId: next.futureId,
      executionId: next.executionId,
      nonce,
      from: next.from,
      tx,
    };

    return { status: "continue", next: onchainTransaction };
  },
  [OnchainStatuses.DEPLOY_CONTRACT_TRANSACTION_REQUEST]: async (
    state,
    next
  ) => {
    assertIgnitionInvariant(
      next !== null && isOnchainTransactionRequest(next),
      `Message not in sync with onchain state - DEPLOY_CONTRACT_TRANSACTION_REQUEST: ${JSON.stringify(
        next,
        serializeReplacer
      )}`
    );

    // TODO: check if transaction already sent? Or is that not possible?
    // Can we do some nonce check here with the nonce of the recorded
    // request?
    let txHash: string;
    try {
      txHash = await state.chainDispatcher.sendTx(next.tx, next.from);
    } catch (error) {
      const executionFailure: ExecutionFailure = {
        type: "execution-failure",
        futureId: next.futureId,
        error: new Error(
          error instanceof Error
            ? "reason" in error
              ? (error.reason as string)
              : error.message
            : "unknown error"
        ),
      };

      return { status: "continue", next: executionFailure };
    }

    const onchainTransactionAccept: OnchainTransactionAccept = {
      type: "onchain-transaction-accept",
      futureId: next.futureId,
      executionId: next.executionId,
      txHash,
    };

    return { status: "continue", next: onchainTransactionAccept };
  },
  async [OnchainStatuses.DEPLOY_CONTRACT_TRANSACTION_ACCEPT](
    state,
    next
  ): Promise<OnchainStateTransitionContinue | OnchainStateTransitionPause> {
    assertIgnitionInvariant(
      next !== null && isOnchainTransactionAccept(next),
      `Message not in sync with onchain state - DEPLOY_CONTRACT_TRANSACTION_ACCEPT: ${JSON.stringify(
        next,
        serializeReplacer
      )}`
    );

    const currentTransaction =
      await state.chainDispatcher.getTransactionReceipt(next.txHash);

    if (currentTransaction === null || currentTransaction === undefined) {
      // No receipt means it hasn't been included in a block yet
      return { status: "pause" };
    }

    if (
      currentTransaction.blockNumber === undefined ||
      // TODO: make default confirmations config
      currentTransaction.confirmations < DEFAULT_CONFIRMATIONS
    ) {
      // transaction pending, move on with batch
      return { status: "pause" };
    }

    const deployResult: OnchainDeployContractSuccessMessage = {
      type: "onchain-result",
      subtype: "deploy-contract-success",
      futureId: next.futureId,
      executionId: next.executionId,
      contractAddress: currentTransaction.contractAddress,
      txId: currentTransaction.transactionHash,
    };

    return { status: "continue", next: deployResult };
  },
  [OnchainStatuses.CALL_FUNCTION_START]: async (state, next) => {
    assertIgnitionInvariant(
      next !== null && isCallFunctionInteraction(next),
      `Message not in sync with onchain state - CALL_FUNCTION_START: ${JSON.stringify(
        next,
        serializeReplacer
      )}`
    );

    const nonce = await state.chainDispatcher.allocateNextNonceForAccount(
      next.from
    );

    const tx = await _convertRequestToCallFunctionTransaction(next, state);
    tx.nonce = nonce;

    const onchainTransaction: OnchainTransactionRequest = {
      type: "onchain-transaction-request",
      futureId: next.futureId,
      executionId: next.executionId,
      nonce,
      from: next.from,
      tx,
    };

    return { status: "continue", next: onchainTransaction };
  },
  [OnchainStatuses.CALL_FUNCTION_TRANSACTION_REQUEST]: async (state, next) => {
    assertIgnitionInvariant(
      next !== null && isOnchainTransactionRequest(next),
      `Message not in sync with onchain state - CALL_FUNCTION_TRANSACTION_REQUEST: ${JSON.stringify(
        next,
        serializeReplacer
      )}`
    );

    // TODO: check if transaction already sent? Or is that not possible?
    // Can we do some nonce check here with the nonce of the recorded
    // request?
    let txHash: string;
    try {
      txHash = await state.chainDispatcher.sendTx(next.tx, next.from);
    } catch (error) {
      const executionFailure: ExecutionFailure = {
        type: "execution-failure",
        futureId: next.futureId,
        error: new Error(
          error instanceof Error
            ? "reason" in error
              ? (error.reason as string)
              : error.message
            : "unknown error"
        ),
      };

      return { status: "continue", next: executionFailure };
    }

    const onchainTransactionAccept: OnchainTransactionAccept = {
      type: "onchain-transaction-accept",
      futureId: next.futureId,
      executionId: next.executionId,
      txHash,
    };

    return { status: "continue", next: onchainTransactionAccept };
  },
  [OnchainStatuses.CALL_FUNCTION_TRANSACTION_ACCEPT]: async (state, next) => {
    assertIgnitionInvariant(
      next !== null && isOnchainTransactionAccept(next),
      `Message not in sync with onchain state - CALL_FUNCTION_TRANSACTION_ACCEPT: ${JSON.stringify(
        next,
        serializeReplacer
      )}`
    );

    const currentTransaction =
      await state.chainDispatcher.getTransactionReceipt(next.txHash);

    if (currentTransaction === null || currentTransaction === undefined) {
      // No receipt means it hasn't been included in a block yet
      return { status: "pause" };
    }

    if (
      currentTransaction.blockNumber === undefined ||
      // TODO: make default confirmations config
      currentTransaction.confirmations < DEFAULT_CONFIRMATIONS
    ) {
      // transaction pending, move on with batch
      return { status: "pause" };
    }

    const deployResult: OnchainCallFunctionSuccessMessage = {
      type: "onchain-result",
      subtype: "call-function-success",
      futureId: next.futureId,
      executionId: next.executionId,
      txId: currentTransaction.transactionHash,
    };

    return { status: "continue", next: deployResult };
  },
  [OnchainStatuses.SEND_DATA_START]: async (state, next) => {
    assertIgnitionInvariant(
      next !== null && isSendDataInteraction(next),
      `Message not in sync with onchain state - SEND_DATA_START: ${JSON.stringify(
        next,
        serializeReplacer
      )}`
    );

    const nonce = await state.chainDispatcher.allocateNextNonceForAccount(
      next.from
    );

    const tx = await _convertRequestToSendDataTransaction(next, state);
    tx.nonce = nonce;

    const onchainTransaction: OnchainTransactionRequest = {
      type: "onchain-transaction-request",
      futureId: next.futureId,
      executionId: next.executionId,
      nonce,
      from: next.from,
      tx,
    };

    return { status: "continue", next: onchainTransaction };
  },
  [OnchainStatuses.SEND_DATA_TRANSACTION_REQUEST]: async (state, next) => {
    assertIgnitionInvariant(
      next !== null && isOnchainTransactionRequest(next),
      `Message not in sync with onchain state - SEND_DATA_TRANSACTION_REQUEST: ${JSON.stringify(
        next,
        serializeReplacer
      )}`
    );

    // TODO: check if transaction already sent? Or is that not possible?
    // Can we do some nonce check here with the nonce of the recorded
    // request?
    let txHash: string;
    try {
      txHash = await state.chainDispatcher.sendTx(next.tx, next.from);
    } catch (error) {
      const executionFailure: ExecutionFailure = {
        type: "execution-failure",
        futureId: next.futureId,
        error: new Error(
          error instanceof Error
            ? "reason" in error
              ? (error.reason as string)
              : error.message
            : "unknown error"
        ),
      };

      return { status: "continue", next: executionFailure };
    }

    const onchainTransactionAccept: OnchainTransactionAccept = {
      type: "onchain-transaction-accept",
      futureId: next.futureId,
      executionId: next.executionId,
      txHash,
    };

    return { status: "continue", next: onchainTransactionAccept };
  },
  [OnchainStatuses.SEND_DATA_TRANSACTION_ACCEPT]: async (state, next) => {
    assertIgnitionInvariant(
      next !== null && isOnchainTransactionAccept(next),
      `Message not in sync with onchain state - SEND_DATA_TRANSACTION_ACCEPT: ${JSON.stringify(
        next,
        serializeReplacer
      )}`
    );

    const currentTransaction =
      await state.chainDispatcher.getTransactionReceipt(next.txHash);

    if (currentTransaction === null || currentTransaction === undefined) {
      // No receipt means it hasn't been included in a block yet
      return { status: "pause" };
    }

    if (
      currentTransaction.blockNumber === undefined ||
      // TODO: make default confirmations config
      currentTransaction.confirmations < DEFAULT_CONFIRMATIONS
    ) {
      // transaction pending, move on with batch
      return { status: "pause" };
    }

    const deployResult: OnchainSendDataSuccessMessage = {
      type: "onchain-result",
      subtype: "send-data-success",
      futureId: next.futureId,
      executionId: next.executionId,
      txId: currentTransaction.transactionHash,
    };

    return { status: "continue", next: deployResult };
  },
  [OnchainStatuses.CONTRACT_AT_START]: async (state, next) => {
    assertIgnitionInvariant(
      next !== null && isContractAtInteraction(next),
      `Message not in sync with onchain state - CONTRACT_AT_START: ${JSON.stringify(
        next,
        serializeReplacer
      )}`
    );

    const contractAtSuccess: OnchainContractAtSuccessMessage = {
      type: "onchain-result",
      subtype: "contract-at-success",
      futureId: next.futureId,
      executionId: next.executionId,
      contractAddress: next.contractAddress,
      contractName: next.contractName,
    };

    return { status: "continue", next: contractAtSuccess };
  },
  [OnchainStatuses.STATIC_CALL_START]: async (state, next) => {
    assertIgnitionInvariant(
      next !== null && isStaticCallInteraction(next),
      `Message not in sync with onchain state - STATIC_CALL_START: ${JSON.stringify(
        next,
        serializeReplacer
      )}`
    );

    const staticCallResult:
      | OnchainStaticCallSuccessMessage
      | OnchainFailureMessage = await _queryStaticCall(next, state);

    if (isOnchainFailureMessage(staticCallResult)) {
      const executionFailure: ExecutionFailure = {
        type: "execution-failure",
        futureId: next.futureId,
        error: staticCallResult.error,
      };

      return { status: "continue", next: executionFailure };
    }

    return { status: "continue", next: staticCallResult };
  },
  [OnchainStatuses.READ_EVENT_ARG_START]: async (state, next) => {
    assertIgnitionInvariant(
      next !== null && isReadEventArgumentInteraction(next),
      `Message not in sync with onchain state - READ_EVENT_ARG_START: ${JSON.stringify(
        next,
        serializeReplacer
      )}`
    );

    const readEventArgResult:
      | OnchainReadEventArgumentSuccessMessage
      | OnchainFailureMessage = await _readEventArg(next, state);

    if (isOnchainFailureMessage(readEventArgResult)) {
      const executionFailure: ExecutionFailure = {
        type: "execution-failure",
        futureId: next.futureId,
        error: readEventArgResult.error,
      };

      return { status: "continue", next: executionFailure };
    }

    return { status: "continue", next: readEventArgResult };
  },
};

async function _convertRequestToDeployTransaction(
  request: DeployContractInteractionMessage,
  state: ExecutionEngineState
): Promise<ethers.providers.TransactionRequest> {
  const artifact = await state.deploymentLoader.loadArtifact(
    request.storedArtifactPath
  );

  const abi = artifact.abi;
  const args = request.args;
  const value = BigInt(request.value);
  const from = request.from;

  // TODO: fix libraries
  const linkedByteCode = await collectLibrariesAndLink(artifact, {});

  const tx = state.chainDispatcher.constructDeployTransaction(
    linkedByteCode,
    abi,
    args,
    value,
    from
  );

  return tx;
}

async function _convertRequestToCallFunctionTransaction(
  request: CallFunctionInteractionMessage,
  state: ExecutionEngineState
): Promise<ethers.providers.TransactionRequest> {
  const artifact = await state.deploymentLoader.loadArtifact(
    request.storedArtifactPath
  );

  const contractAddress: string = request.contractAddress;
  const abi = artifact.abi;
  const functionName: string = request.functionName;
  const args: ArgumentType[] = request.args;
  const value: bigint = BigInt(request.value);
  const from: string = request.from;

  const unsignedTx = state.chainDispatcher.constructCallTransaction(
    contractAddress,
    abi,
    functionName,
    args,
    value,
    from
  );

  return unsignedTx;
}

async function _convertRequestToSendDataTransaction(
  request: SendDataInteractionMessage,
  _state: ExecutionEngineState
): Promise<ethers.providers.TransactionRequest> {
  const unsignedTx: ethers.providers.TransactionRequest = {
    from: request.from,
    to: request.to,
    value: BigInt(request.value),
    data: request.data,
  };

  return unsignedTx;
}

async function _queryStaticCall(
  request: StaticCallInteractionMessage,
  state: ExecutionEngineState
): Promise<OnchainStaticCallSuccessMessage | OnchainFailureMessage> {
  const artifact = await state.deploymentLoader.loadArtifact(
    request.storedArtifactPath
  );

  try {
    const result = await state.chainDispatcher.staticCallQuery(
      request.contractAddress,
      artifact.abi,
      request.functionName,
      request.args,
      request.from
    );

    assertIgnitionInvariant(
      result !== undefined,
      "Static call result not available"
    );

    return {
      type: "onchain-result",
      subtype: "static-call-success",
      futureId: request.futureId,
      executionId: request.executionId,
      result,
    };
  } catch (error) {
    return {
      type: "onchain-result",
      subtype: "failure",
      futureId: request.futureId,
      executionId: request.executionId,
      error:
        error instanceof Error ? error : new Error("Unknown static call error"),
    };
  }
}

async function _readEventArg(
  request: ReadEventArgumentInteractionMessage,
  state: ExecutionEngineState
): Promise<OnchainReadEventArgumentSuccessMessage | OnchainFailureMessage> {
  const artifact = await state.deploymentLoader.loadArtifact(
    request.storedArtifactPath
  );

  try {
    const result = await state.chainDispatcher.getEventArgument(
      request.eventName,
      request.argumentName,
      request.txToReadFrom,
      request.eventIndex,
      request.emitterAddress,
      artifact.abi
    );

    return {
      type: "onchain-result",
      subtype: "read-event-arg-success",
      futureId: request.futureId,
      executionId: request.executionId,
      result,
    };
  } catch (error) {
    return {
      type: "onchain-result",
      subtype: "failure",
      futureId: request.futureId,
      executionId: request.executionId,
      error:
        error instanceof Error
          ? error
          : new Error("Unknown read event arg error"),
    };
  }
}
