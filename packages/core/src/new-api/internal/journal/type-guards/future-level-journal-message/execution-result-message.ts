import {
  ExecutionFailure,
  ExecutionHold,
  ExecutionResultMessage,
  ExecutionTimeout,
  JournalableMessage,
} from "../../types";

import { isExecutionSuccess } from "./execution-success";

export function isExecutionResultMessage(
  potential: JournalableMessage
): potential is ExecutionResultMessage {
  return (
    isExecutionSuccess(potential) ||
    isExecutionTimeout(potential) ||
    isExecutionFailure(potential) ||
    isExecutionHold(potential)
  );
}

export function isExecutionFailure(
  potential: JournalableMessage
): potential is ExecutionFailure {
  return potential.type === "execution-failure";
}

export function isExecutionTimeout(
  potential: JournalableMessage
): potential is ExecutionTimeout {
  return potential.type === "execution-timeout";
}

export function isExecutionHold(
  potential: JournalableMessage
): potential is ExecutionHold {
  return potential.type === "execution-hold";
}
