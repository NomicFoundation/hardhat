import { IgnitionError } from "../../../errors";
import { TransactionMessage } from "../../types/journal";
import {
  isOnchainCallFunctionSuccessMessage,
  isOnchainContractAtSuccessMessage,
  isOnchainDeployContractSuccessMessage,
  isOnchainFailureMessage,
  isOnchainReadEventArgumentSuccessMessage,
  isOnchainSendDataSuccessMessage,
  isOnchainStaticCallSuccessMessage,
  isOnchainTransactionAccept,
  isOnchainTransactionRequest,
  isOnchainTransactionReset,
} from "../journal/type-guards";
import { serializeReplacer } from "../journal/utils/serialize-replacer";
import { OnchainState, OnchainStatuses } from "../types/execution-state";
import { assertIgnitionInvariant } from "../utils/assertions";

import {
  isCallFunctionInteraction,
  isContractAtInteraction,
  isDeployContractInteraction,
  isReadEventArgumentInteraction,
  isSendDataInteraction,
  isStaticCallInteraction,
} from "./guards";

export function onchainActionReducer(
  state: OnchainState,
  action: TransactionMessage
): OnchainState {
  // #region "contractAt"
  if (isContractAtInteraction(action)) {
    assertCurrentStatus([OnchainStatuses.EXECUTE], state, action);

    return {
      ...state,
      status: OnchainStatuses.CONTRACT_AT_START,
      currentExecution: action.executionId,
      actions: {
        [action.executionId]: { contractAt: null },
      },
    };
  }

  if (isOnchainContractAtSuccessMessage(action)) {
    assertCurrentStatus([OnchainStatuses.CONTRACT_AT_START], state, action);

    return {
      ...state,
      status: OnchainStatuses.EXECUTE,
      currentExecution: action.executionId,
      actions: {
        [action.executionId]: { contractAt: action },
      },
    };
  }

  // #endregion

  // #region "deploy contract"

  if (isDeployContractInteraction(action)) {
    assertCurrentStatus([OnchainStatuses.EXECUTE], state, action);

    return {
      ...state,
      status: OnchainStatuses.DEPLOY_CONTRACT_START,
      currentExecution: action.executionId,
      actions: {
        [action.executionId]: {
          start: action,
          request: null,
          txHash: null,
          receipt: null,
        },
      },
    };
  }

  if (isOnchainTransactionRequest(action)) {
    assertCurrentStatus(
      [
        OnchainStatuses.DEPLOY_CONTRACT_START,
        OnchainStatuses.CALL_FUNCTION_START,
        OnchainStatuses.SEND_DATA_START,
      ],
      state,
      action
    );

    if (state.status === OnchainStatuses.DEPLOY_CONTRACT_START) {
      return {
        ...state,
        status: OnchainStatuses.DEPLOY_CONTRACT_TRANSACTION_REQUEST,
        from: action.from,
        nonce: action.nonce,
        actions: {
          [action.executionId]: {
            ...state.actions[action.executionId],
            request: action,
            txHash: null,
            receipt: null,
          },
        },
      };
    } else if (state.status === OnchainStatuses.CALL_FUNCTION_START) {
      return {
        ...state,
        status: OnchainStatuses.CALL_FUNCTION_TRANSACTION_REQUEST,
        from: action.from,
        nonce: action.nonce,
        actions: {
          [action.executionId]: {
            ...state.actions[action.executionId],
            request: action,
            txHash: null,
            receipt: null,
          },
        },
      };
    } else if (state.status === OnchainStatuses.SEND_DATA_START) {
      return {
        ...state,
        status: OnchainStatuses.SEND_DATA_TRANSACTION_REQUEST,
        from: action.from,
        nonce: action.nonce,
        actions: {
          [action.executionId]: {
            ...state.actions[action.executionId],
            request: action,
            txHash: null,
            receipt: null,
          },
        },
      };
    } else {
      throw new IgnitionError(
        `Unexpected status for transaction request ${state?.status as any}`
      );
    }
  }

  if (isOnchainTransactionAccept(action)) {
    assertCurrentStatus(
      [
        OnchainStatuses.DEPLOY_CONTRACT_TRANSACTION_REQUEST,
        OnchainStatuses.CALL_FUNCTION_TRANSACTION_REQUEST,
        OnchainStatuses.SEND_DATA_TRANSACTION_REQUEST,
      ],
      state,
      action
    );

    if (state.status === OnchainStatuses.DEPLOY_CONTRACT_TRANSACTION_REQUEST) {
      return {
        ...state,
        status: OnchainStatuses.DEPLOY_CONTRACT_TRANSACTION_ACCEPT,
        txHash: action.txHash,
        actions: {
          [action.executionId]: {
            ...state.actions[action.executionId],
            txHash: action,
            receipt: null,
          },
        },
      };
    } else if (
      state.status === OnchainStatuses.CALL_FUNCTION_TRANSACTION_REQUEST
    ) {
      return {
        ...state,
        status: OnchainStatuses.CALL_FUNCTION_TRANSACTION_ACCEPT,
        txHash: action.txHash,
        actions: {
          [action.executionId]: {
            ...state.actions[action.executionId],
            txHash: action,
            receipt: null,
          },
        },
      };
    } else if (state.status === OnchainStatuses.SEND_DATA_TRANSACTION_REQUEST) {
      return {
        ...state,
        status: OnchainStatuses.SEND_DATA_TRANSACTION_ACCEPT,
        txHash: action.txHash,
        actions: {
          [action.executionId]: {
            ...state.actions[action.executionId],
            txHash: action,
            receipt: null,
          },
        },
      };
    } else {
      throw new IgnitionError(
        `Unexpected status for transaction accept ${state?.status as any}`
      );
    }
  }

  if (isOnchainTransactionReset(action)) {
    assertCurrentStatus(
      [
        OnchainStatuses.DEPLOY_CONTRACT_TRANSACTION_ACCEPT,
        OnchainStatuses.CALL_FUNCTION_TRANSACTION_ACCEPT,
        OnchainStatuses.SEND_DATA_TRANSACTION_ACCEPT,
      ],
      state,
      action
    );

    if (state.status === OnchainStatuses.DEPLOY_CONTRACT_TRANSACTION_ACCEPT) {
      const previousStart = (state.actions[action.executionId] as any).start;

      return {
        ...state,
        status: OnchainStatuses.DEPLOY_CONTRACT_START,
        currentExecution: state.currentExecution,
        from: null,
        nonce: null,
        txHash: null,
        actions: {
          [action.executionId]: {
            start: previousStart,
            request: null,
            txHash: null,
            receipt: null,
          },
        },
      };
    } else if (
      state.status === OnchainStatuses.CALL_FUNCTION_TRANSACTION_ACCEPT
    ) {
      const previousStart = (state.actions[action.executionId] as any).start;

      return {
        ...state,
        status: OnchainStatuses.CALL_FUNCTION_START,
        currentExecution: state.currentExecution,
        from: null,
        nonce: null,
        txHash: null,
        actions: {
          [action.executionId]: {
            start: previousStart,
            request: null,
            txHash: null,
            receipt: null,
          },
        },
      };
    } else if (state.status === OnchainStatuses.SEND_DATA_TRANSACTION_ACCEPT) {
      const previousStart = (state.actions[action.executionId] as any).start;

      return {
        ...state,
        status: OnchainStatuses.SEND_DATA_START,
        currentExecution: state.currentExecution,
        from: null,
        nonce: null,
        txHash: null,
        actions: {
          [action.executionId]: {
            start: previousStart,
            request: null,
            txHash: null,
            receipt: null,
          },
        },
      };
    } else {
      throw new IgnitionError(
        `Unexpected status for transaction accept ${state?.status as any}`
      );
    }
  }

  if (isOnchainDeployContractSuccessMessage(action)) {
    assertCurrentStatus(
      [OnchainStatuses.DEPLOY_CONTRACT_TRANSACTION_ACCEPT],
      state,
      action
    );

    return {
      ...state,
      status: OnchainStatuses.EXECUTE,
      currentExecution: null,
      from: null,
      nonce: null,
      txHash: null,
      actions: {
        [action.executionId]: {
          ...state.actions[action.executionId],
          receipt: action,
        },
      },
    };
  }

  // #endregion

  // #region "call-function"

  if (isCallFunctionInteraction(action)) {
    assertCurrentStatus([OnchainStatuses.EXECUTE], state, action);

    return {
      ...state,
      status: OnchainStatuses.CALL_FUNCTION_START,
      currentExecution: action.executionId,
      actions: {
        [action.executionId]: {
          start: action,
          request: null,
          txHash: null,
          receipt: null,
        },
      },
    };
  }

  if (isOnchainCallFunctionSuccessMessage(action)) {
    assertCurrentStatus(
      [OnchainStatuses.CALL_FUNCTION_TRANSACTION_ACCEPT],
      state,
      action
    );

    return {
      ...state,
      status: OnchainStatuses.EXECUTE,
      currentExecution: null,
      from: null,
      nonce: null,
      txHash: null,
      actions: {
        [action.executionId]: {
          ...state.actions[action.executionId],
          receipt: action,
        },
      },
    };
  }

  // #endregion

  // #region "send data"

  if (isSendDataInteraction(action)) {
    assertCurrentStatus([OnchainStatuses.EXECUTE], state, action);

    return {
      ...state,
      status: OnchainStatuses.SEND_DATA_START,
      currentExecution: action.executionId,
      actions: {
        [action.executionId]: {
          start: action,
          request: null,
          txHash: null,
          receipt: null,
        },
      },
    };
  }

  if (isOnchainSendDataSuccessMessage(action)) {
    assertCurrentStatus(
      [OnchainStatuses.SEND_DATA_TRANSACTION_ACCEPT],
      state,
      action
    );

    return {
      ...state,
      status: OnchainStatuses.EXECUTE,
      currentExecution: null,
      from: null,
      nonce: null,
      txHash: null,
      actions: {
        [action.executionId]: {
          ...state.actions[action.executionId],
          receipt: action,
        },
      },
    };
  }

  // #endregion

  // #region "static-call"

  if (isStaticCallInteraction(action)) {
    assertCurrentStatus([OnchainStatuses.EXECUTE], state, action);

    return {
      ...state,
      status: OnchainStatuses.STATIC_CALL_START,
      currentExecution: action.executionId,
      actions: {
        [action.executionId]: { result: null },
      },
    };
  }

  if (isOnchainStaticCallSuccessMessage(action)) {
    assertCurrentStatus([OnchainStatuses.STATIC_CALL_START], state, action);

    return {
      ...state,
      status: OnchainStatuses.EXECUTE,
      currentExecution: null,
      from: null,
      nonce: null,
      txHash: null,
      actions: {
        [action.executionId]: { result: action },
      },
    };
  }

  // #endregion

  // #region "read event arg"

  if (isReadEventArgumentInteraction(action)) {
    assertCurrentStatus([OnchainStatuses.EXECUTE], state, action);

    return {
      ...state,
      status: OnchainStatuses.READ_EVENT_ARG_START,
      currentExecution: action.executionId,
      actions: {
        [action.executionId]: { result: null },
      },
    };
  }

  if (isOnchainReadEventArgumentSuccessMessage(action)) {
    assertCurrentStatus([OnchainStatuses.READ_EVENT_ARG_START], state, action);

    return {
      ...state,
      status: OnchainStatuses.EXECUTE,
      currentExecution: null,
      from: null,
      nonce: null,
      txHash: null,
      actions: {
        [action.executionId]: { result: action },
      },
    };
  }

  // #endregion

  if (isOnchainFailureMessage(action)) {
    // currently we ignore and let direct translation
    // into a ExecutionFailure take over
    return state;
  }

  return assertNeverActionType(action);
}

function assertCurrentStatus(
  statuses: OnchainStatuses[],
  state: OnchainState,
  action: TransactionMessage
) {
  assertIgnitionInvariant(
    statuses.includes(state.status),
    `Can only move from ${statuses.join(" or ")} but found ${
      state.status
    } when processing: ${JSON.stringify(action, serializeReplacer)}`
  );
}

function assertNeverActionType(action: never): OnchainState {
  throw new Error(`Unknown action type ${JSON.stringify(action)}`);
}
