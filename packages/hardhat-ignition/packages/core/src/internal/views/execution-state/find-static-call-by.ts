import {
  CallExecutionState,
  DeploymentExecutionState,
  SendDataExecutionState,
  StaticCallExecutionState,
} from "../../execution/types/execution-state";
import {
  NetworkInteractionType,
  StaticCall,
} from "../../execution/types/network-interaction";
import { assertIgnitionInvariant } from "../../utils/assertions";

export function findStaticCallBy(
  executionState:
    | DeploymentExecutionState
    | CallExecutionState
    | StaticCallExecutionState
    | SendDataExecutionState,
  networkInteractionId: number
): StaticCall {
  const staticCall = executionState.networkInteractions.find(
    (interaction) => interaction.id === networkInteractionId
  );

  assertIgnitionInvariant(
    staticCall !== undefined,
    `Expected static call ${executionState.id}/${networkInteractionId} to exist, but it did not`
  );

  assertIgnitionInvariant(
    staticCall.type === NetworkInteractionType.STATIC_CALL,
    `Expected network interaction ${executionState.id}/${networkInteractionId} to be a static call, but instead it was ${staticCall.type}`
  );

  return staticCall;
}
