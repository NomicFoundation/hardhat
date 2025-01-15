import { assertIgnitionInvariant } from "../../../utils/assertions";
import { JsonRpcClient } from "../../jsonrpc-client";
import {
  CallExecutionState,
  DeploymentExecutionState,
  SendDataExecutionState,
  StaticCallExecutionState,
} from "../../types/execution-state";
import {
  JournalMessageType,
  StaticCallCompleteMessage,
} from "../../types/messages";
import { NetworkInteractionType } from "../../types/network-interaction";
import { runStaticCall } from "../helpers/network-interaction-execution";

/**
 * Runs a static call and returns a message indicating its completion.
 *
 * SIDE EFFECTS: This function doesn't have any side effects.
 *
 * @param exState The execution state that requested the static call.
 * @param jsonRpcClient The JSON RPC client to use for the static call.
 * @returns A message indicating the completion of the static call.
 */
export async function queryStaticCall(
  exState:
    | DeploymentExecutionState
    | CallExecutionState
    | SendDataExecutionState
    | StaticCallExecutionState,
  jsonRpcClient: JsonRpcClient
): Promise<StaticCallCompleteMessage> {
  const lastNetworkInteraction = exState.networkInteractions.at(-1);

  assertIgnitionInvariant(
    lastNetworkInteraction !== undefined,
    `Network interaction not found for ExecutionState ${exState.id} when trying to run a StaticCall`
  );

  assertIgnitionInvariant(
    lastNetworkInteraction.type === NetworkInteractionType.STATIC_CALL,
    `Transaction found as last network interaction of ExecutionState ${exState.id} when trying to run a StaticCall`
  );

  assertIgnitionInvariant(
    lastNetworkInteraction.result === undefined,
    `Resolved StaticCall found in ${exState.id}/${lastNetworkInteraction.id} when trying to run it`
  );

  const result = await runStaticCall(jsonRpcClient, lastNetworkInteraction);

  return {
    type: JournalMessageType.STATIC_CALL_COMPLETE,
    futureId: exState.id,
    networkInteractionId: lastNetworkInteraction.id,
    result,
  };
}
