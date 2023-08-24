import {
  ExecutionEventListener,
  ExecutionEventType,
} from "@ignored/ignition-core";

import { callExecutionStateCompleteListener } from "./listeners/callExecutionStateCompleteListener";
import { callExecutionStateInitializeListener } from "./listeners/callExecutionStateInitializeListener";
import { contractAtExecutionStateInitializeListener } from "./listeners/contractAtExecutionStateInitializeListener";
import { deploymentExecutionStateCompleteListener } from "./listeners/deploymentExecutionStateCompleteListener";
import { deploymentExecutionStateInitializeListener } from "./listeners/deploymentExecutionStateInitializeListener";
import { readEventExecutionStateInitializeListener } from "./listeners/readEventExecutionStateInitializeListener";
import { runStartListener } from "./listeners/runStartListener";
import { sendDataExecutionStateCompleteListener } from "./listeners/sendDataExecutionStateCompleteListener";
import { sendDataExecutionStateInitializeListener } from "./listeners/sendDataExecutionStateInitializeListener";
import { staticCallExecutionStateCompleteListener } from "./listeners/staticCallExecutionStateCompleteListener";
import { staticCallExecutionStateInitializeListener } from "./listeners/staticCallExecutionStateInitializeListener";
import { wipeExecutionStateListener } from "./listeners/wipeExecutionStateListener";

export function setupExecutionEventListeners(): ExecutionEventListener {
  return {
    [ExecutionEventType.RUN_START]: runStartListener,
    [ExecutionEventType.WIPE_EXECUTION_STATE]: wipeExecutionStateListener,
    [ExecutionEventType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE]:
      deploymentExecutionStateInitializeListener,
    [ExecutionEventType.DEPLOYMENT_EXECUTION_STATE_COMPLETE]:
      deploymentExecutionStateCompleteListener,
    [ExecutionEventType.CALL_EXECUTION_STATE_INITIALIZE]:
      callExecutionStateInitializeListener,
    [ExecutionEventType.CALL_EXECUTION_STATE_COMPLETE]:
      callExecutionStateCompleteListener,
    [ExecutionEventType.STATIC_CALL_EXECUTION_STATE_INITIALIZE]:
      staticCallExecutionStateInitializeListener,
    [ExecutionEventType.STATIC_CALL_EXECUTION_STATE_COMPLETE]:
      staticCallExecutionStateCompleteListener,
    [ExecutionEventType.SEND_DATA_EXECUTION_STATE_INITIALIZE]:
      sendDataExecutionStateInitializeListener,
    [ExecutionEventType.SEND_DATA_EXECUTION_STATE_COMPLETE]:
      sendDataExecutionStateCompleteListener,
    [ExecutionEventType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE]:
      contractAtExecutionStateInitializeListener,
    [ExecutionEventType.READ_EVENT_ARGUMENT_EXECUTION_STATE_INITIALIZE]:
      readEventExecutionStateInitializeListener,
  };
}
