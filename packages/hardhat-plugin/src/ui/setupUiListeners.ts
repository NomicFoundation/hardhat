import { UiEventListener, UiEventType } from "@ignored/ignition-core";

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

export function setupUiListeners(): UiEventListener {
  return {
    [UiEventType.RUN_START]: runStartListener,
    [UiEventType.WIPE_EXECUTION_STATE]: wipeExecutionStateListener,
    [UiEventType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE]:
      deploymentExecutionStateInitializeListener,
    [UiEventType.DEPLOYMENT_EXECUTION_STATE_COMPLETE]:
      deploymentExecutionStateCompleteListener,
    [UiEventType.CALL_EXECUTION_STATE_INITIALIZE]:
      callExecutionStateInitializeListener,
    [UiEventType.CALL_EXECUTION_STATE_COMPLETE]:
      callExecutionStateCompleteListener,
    [UiEventType.STATIC_CALL_EXECUTION_STATE_INITIALIZE]:
      staticCallExecutionStateInitializeListener,
    [UiEventType.STATIC_CALL_EXECUTION_STATE_COMPLETE]:
      staticCallExecutionStateCompleteListener,
    [UiEventType.SEND_DATA_EXECUTION_STATE_INITIALIZE]:
      sendDataExecutionStateInitializeListener,
    [UiEventType.SEND_DATA_EXECUTION_STATE_COMPLETE]:
      sendDataExecutionStateCompleteListener,
    [UiEventType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE]:
      contractAtExecutionStateInitializeListener,
    [UiEventType.READ_EVENT_ARGUMENT_EXECUTION_STATE_INITIALIZE]:
      readEventExecutionStateInitializeListener,
  };
}
