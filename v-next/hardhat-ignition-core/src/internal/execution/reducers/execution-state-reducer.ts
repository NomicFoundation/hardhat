import { assertIgnitionInvariant } from "../../utils/assertions";
import { MapExStateTypeToExState } from "../type-helpers";
import { ExecutionSateType, ExecutionState } from "../types/execution-state";
import {
  CallExecutionStateCompleteMessage,
  CallExecutionStateInitializeMessage,
  ContractAtExecutionStateInitializeMessage,
  DeploymentExecutionStateCompleteMessage,
  DeploymentExecutionStateInitializeMessage,
  EncodeFunctionCallExecutionStateInitializeMessage,
  JournalMessage,
  JournalMessageType,
  NetworkInteractionRequestMessage,
  OnchainInteractionBumpFeesMessage,
  OnchainInteractionDroppedMessage,
  OnchainInteractionReplacedByUserMessage,
  OnchainInteractionTimeoutMessage,
  ReadEventArgExecutionStateInitializeMessage,
  SendDataExecutionStateCompleteMessage,
  SendDataExecutionStateInitializeMessage,
  StaticCallCompleteMessage,
  StaticCallExecutionStateCompleteMessage,
  StaticCallExecutionStateInitializeMessage,
  TransactionConfirmMessage,
  TransactionSendMessage,
} from "../types/messages";

import { completeExecutionState } from "./helpers/complete-execution-state";
import {
  initialiseCallExecutionStateFrom,
  initialiseContractAtExecutionStateFrom,
  initialiseDeploymentExecutionStateFrom,
  initialiseEncodeFunctionCallExecutionStateFrom,
  initialiseReadEventArgumentExecutionStateFrom,
  initialiseSendDataExecutionStateFrom,
  initialiseStaticCallExecutionStateFrom,
} from "./helpers/initializers";
import {
  appendNetworkInteraction,
  appendTransactionToOnchainInteraction,
  bumpOnchainInteractionFees,
  completeStaticCall,
  confirmTransaction,
  onchainInteractionTimedOut,
  resendDroppedOnchainInteraction,
  resetOnchainInteractionReplacedByUser,
} from "./helpers/network-interaction-helpers";

const exStateTypesThatSupportOnchainInteractions: Array<
  | ExecutionSateType.DEPLOYMENT_EXECUTION_STATE
  | ExecutionSateType.CALL_EXECUTION_STATE
  | ExecutionSateType.SEND_DATA_EXECUTION_STATE
> = [
  ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
  ExecutionSateType.CALL_EXECUTION_STATE,
  ExecutionSateType.SEND_DATA_EXECUTION_STATE,
];

const exStateTypesThatSupportOnchainInteractionsAndStaticCalls: Array<
  | ExecutionSateType.DEPLOYMENT_EXECUTION_STATE
  | ExecutionSateType.CALL_EXECUTION_STATE
  | ExecutionSateType.SEND_DATA_EXECUTION_STATE
  | ExecutionSateType.STATIC_CALL_EXECUTION_STATE
> = [
  ...exStateTypesThatSupportOnchainInteractions,
  ExecutionSateType.STATIC_CALL_EXECUTION_STATE,
];

export function executionStateReducer(
  state: ExecutionState | undefined,
  action:
    | DeploymentExecutionStateInitializeMessage
    | DeploymentExecutionStateCompleteMessage
    | CallExecutionStateInitializeMessage
    | CallExecutionStateCompleteMessage
    | StaticCallExecutionStateInitializeMessage
    | StaticCallExecutionStateCompleteMessage
    | SendDataExecutionStateInitializeMessage
    | SendDataExecutionStateCompleteMessage
    | ContractAtExecutionStateInitializeMessage
    | ReadEventArgExecutionStateInitializeMessage
    | EncodeFunctionCallExecutionStateInitializeMessage
    | NetworkInteractionRequestMessage
    | TransactionSendMessage
    | TransactionConfirmMessage
    | StaticCallCompleteMessage
    | OnchainInteractionBumpFeesMessage
    | OnchainInteractionDroppedMessage
    | OnchainInteractionReplacedByUserMessage
    | OnchainInteractionTimeoutMessage,
): ExecutionState {
  switch (action.type) {
    case JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE:
      return initialiseDeploymentExecutionStateFrom(action);
    case JournalMessageType.CALL_EXECUTION_STATE_INITIALIZE:
      return initialiseCallExecutionStateFrom(action);
    case JournalMessageType.STATIC_CALL_EXECUTION_STATE_INITIALIZE:
      return initialiseStaticCallExecutionStateFrom(action);
    case JournalMessageType.SEND_DATA_EXECUTION_STATE_INITIALIZE:
      return initialiseSendDataExecutionStateFrom(action);
    case JournalMessageType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE:
      return initialiseContractAtExecutionStateFrom(action);
    case JournalMessageType.READ_EVENT_ARGUMENT_EXECUTION_STATE_INITIALIZE:
      return initialiseReadEventArgumentExecutionStateFrom(action);
    case JournalMessageType.ENCODE_FUNCTION_CALL_EXECUTION_STATE_INITIALIZE:
      return initialiseEncodeFunctionCallExecutionStateFrom(action);
    case JournalMessageType.DEPLOYMENT_EXECUTION_STATE_COMPLETE:
      return _ensureStateThen(
        state,
        action,
        [ExecutionSateType.DEPLOYMENT_EXECUTION_STATE],
        completeExecutionState,
      );
    case JournalMessageType.CALL_EXECUTION_STATE_COMPLETE:
      return _ensureStateThen(
        state,
        action,
        [ExecutionSateType.CALL_EXECUTION_STATE],
        completeExecutionState,
      );
    case JournalMessageType.STATIC_CALL_EXECUTION_STATE_COMPLETE:
      return _ensureStateThen(
        state,
        action,
        [ExecutionSateType.STATIC_CALL_EXECUTION_STATE],
        completeExecutionState,
      );
    case JournalMessageType.SEND_DATA_EXECUTION_STATE_COMPLETE:
      return _ensureStateThen(
        state,
        action,
        [ExecutionSateType.SEND_DATA_EXECUTION_STATE],
        completeExecutionState,
      );
    case JournalMessageType.NETWORK_INTERACTION_REQUEST:
      return _ensureStateThen(
        state,
        action,
        exStateTypesThatSupportOnchainInteractionsAndStaticCalls,
        appendNetworkInteraction,
      );
    case JournalMessageType.STATIC_CALL_COMPLETE:
      return _ensureStateThen(
        state,
        action,
        exStateTypesThatSupportOnchainInteractionsAndStaticCalls,
        completeStaticCall,
      );
    case JournalMessageType.TRANSACTION_SEND:
      return _ensureStateThen(
        state,
        action,
        exStateTypesThatSupportOnchainInteractions,
        appendTransactionToOnchainInteraction,
      );
    case JournalMessageType.TRANSACTION_CONFIRM:
      return _ensureStateThen(
        state,
        action,
        exStateTypesThatSupportOnchainInteractions,
        confirmTransaction,
      );
    case JournalMessageType.ONCHAIN_INTERACTION_BUMP_FEES:
      return _ensureStateThen(
        state,
        action,
        exStateTypesThatSupportOnchainInteractions,
        bumpOnchainInteractionFees,
      );
    case JournalMessageType.ONCHAIN_INTERACTION_DROPPED:
      return _ensureStateThen(
        state,
        action,
        exStateTypesThatSupportOnchainInteractions,
        resendDroppedOnchainInteraction,
      );
    case JournalMessageType.ONCHAIN_INTERACTION_REPLACED_BY_USER:
      return _ensureStateThen(
        state,
        action,
        exStateTypesThatSupportOnchainInteractions,
        resetOnchainInteractionReplacedByUser,
      );
    case JournalMessageType.ONCHAIN_INTERACTION_TIMEOUT:
      return _ensureStateThen(
        state,
        action,
        exStateTypesThatSupportOnchainInteractions,
        onchainInteractionTimedOut,
      );
  }
}

/**
 * Ensure the execution state is defined and of the correct type, then
 * run the given `then` function.
 *
 * @param state - the execution state
 * @param action - the message to reduce
 * @param allowedExStateTypes - the allowed execution states for the message
 * @param then - the reducer that will be passed the checked state and message
 * @returns a copy of the updated execution state
 */
function _ensureStateThen<
  ExStateT extends ExecutionSateType,
  Message extends JournalMessage,
>(
  state: ExecutionState | undefined,
  action: Message,
  allowedExStateTypes: ExStateT[],
  then: (
    state: MapExStateTypeToExState<ExStateT>,
    action: Message,
  ) => MapExStateTypeToExState<ExStateT>,
): ExecutionState {
  assertIgnitionInvariant(
    state !== undefined,
    `Execution state must be defined`,
  );

  assertIgnitionInvariant(
    allowedExStateTypes.includes(state.type as ExStateT),
    `The execution state ${state.type} is not supported`,
  );

  return then(state as MapExStateTypeToExState<ExStateT>, action);
}
