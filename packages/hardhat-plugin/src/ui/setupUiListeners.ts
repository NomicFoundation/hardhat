import { UiEventEmitter, UiEventType } from "@ignored/ignition-core";

export function setupUiListeners(uiEventListener: UiEventEmitter): void {
  uiEventListener.on(UiEventType.RUN_START, (data) => {
    console.log("render ui stuff");
  });

  uiEventListener.on(UiEventType.WIPE_EXECUTION_STATE, (data) => {
    console.log("render ui stuff");
  });

  uiEventListener.on(
    UiEventType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE,
    (data) => {
      console.log("render ui stuff");
    }
  );

  uiEventListener.on(
    UiEventType.DEPLOYMENT_EXECUTION_STATE_COMPLETE,
    (data) => {
      console.log("render ui stuff");
    }
  );

  uiEventListener.on(UiEventType.CALL_EXECUTION_STATE_INITIALIZE, (data) => {
    console.log("render ui stuff");
  });

  uiEventListener.on(UiEventType.CALL_EXECUTION_STATE_COMPLETE, (data) => {
    console.log("render ui stuff");
  });

  uiEventListener.on(
    UiEventType.STATIC_CALL_EXECUTION_STATE_INITIALIZE,
    (data) => {
      console.log("render ui stuff");
    }
  );

  uiEventListener.on(
    UiEventType.STATIC_CALL_EXECUTION_STATE_COMPLETE,
    (data) => {
      console.log("render ui stuff");
    }
  );

  uiEventListener.on(
    UiEventType.SEND_DATA_EXECUTION_STATE_INITIALIZE,
    (data) => {
      console.log("render ui stuff");
    }
  );

  uiEventListener.on(UiEventType.SEND_DATA_EXECUTION_STATE_COMPLETE, (data) => {
    console.log("render ui stuff");
  });

  uiEventListener.on(
    UiEventType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE,
    (data) => {
      console.log("render ui stuff");
    }
  );

  uiEventListener.on(
    UiEventType.READ_EVENT_ARGUMENT_EXECUTION_STATE_INITIALIZE,
    (data) => {
      console.log("render ui stuff");
    }
  );
}
