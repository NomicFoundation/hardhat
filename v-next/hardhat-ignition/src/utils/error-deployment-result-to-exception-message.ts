import type {
  ExecutionErrorDeploymentResult,
  PreviousRunErrorDeploymentResult,
  ReconciliationErrorDeploymentResult,
  ValidationErrorDeploymentResult} from "@ignored/hardhat-vnext-ignition-core";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import {
  DeploymentResultType
} from "@ignored/hardhat-vnext-ignition-core";

/**
 * Converts the result of an errored deployment into a message that can
 * be shown to the user in an exception.
 *
 * @param result - the errored deployment's result
 * @returns the text of the message
 */
export function errorDeploymentResultToExceptionMessage(
  result:
    | ValidationErrorDeploymentResult
    | ReconciliationErrorDeploymentResult
    | ExecutionErrorDeploymentResult
    | PreviousRunErrorDeploymentResult,
): string {
  switch (result.type) {
    case DeploymentResultType.VALIDATION_ERROR:
      return _convertValidationError(result);
    case DeploymentResultType.RECONCILIATION_ERROR:
      return _convertReconciliationError(result);
    case DeploymentResultType.EXECUTION_ERROR:
      return _convertExecutionError(result);
    case DeploymentResultType.PREVIOUS_RUN_ERROR:
      return _convertPreviousRunError(result);
  }
}

function _convertValidationError(
  result: ValidationErrorDeploymentResult,
): string {
  const errorsList = Object.entries(result.errors).flatMap(
    ([futureId, errors]) => errors.map((err) => `  * ${futureId}: ${err}`),
  );

  return `The deployment wasn't run because of the following validation errors:

${errorsList.join("\n")}`;
}

function _convertReconciliationError(
  result: ReconciliationErrorDeploymentResult,
) {
  const errorsList = Object.entries(result.errors).flatMap(
    ([futureId, errors]) => errors.map((err) => `  * ${futureId}: ${err}`),
  );

  return `The deployment wasn't run because of the following reconciliation errors:

${errorsList.join("\n")}`;
}

function _convertExecutionError(result: ExecutionErrorDeploymentResult) {
  const sections: string[] = [];

  const messageDetails = {
    timeouts: result.timedOut.length > 0,
    failures: result.failed.length > 0,
    held: result.held.length > 0,
  };

  if (messageDetails.timeouts) {
    const timeoutList = result.timedOut.map(
      ({ futureId, networkInteractionId }) =>
        `  * ${futureId}/${networkInteractionId}`,
    );

    sections.push(`Timed out:\n\n${timeoutList.join("\n")}`);
  }

  if (messageDetails.failures) {
    const errorList = result.failed.map(
      ({ futureId, networkInteractionId, error }) =>
        `  * ${futureId}/${networkInteractionId}: ${error}`,
    );

    sections.push(`Failures:\n\n${errorList.join("\n")}`);
  }

  if (messageDetails.held) {
    const reasonList = result.held.map(
      ({ futureId, heldId, reason }) => `  * ${futureId}/${heldId}: ${reason}`,
    );

    sections.push(`Held:\n\n${reasonList.join("\n")}`);
  }

  return `The deployment wasn't successful, there were ${_toText(
    messageDetails,
  )}:

${sections.join("\n\n")}`;
}

function _convertPreviousRunError(result: PreviousRunErrorDeploymentResult) {
  const errorsList = Object.entries(result.errors).flatMap(
    ([futureId, errors]) => errors.map((err) => `  * ${futureId}: ${err}`),
  );

  return `The deployment wasn't run because of the following errors in a previous run:

${errorsList.join("\n")}`;
}

function _toText({
  timeouts,
  failures,
  held,
}: {
  timeouts: boolean;
  failures: boolean;
  held: boolean;
}): string {
  if (timeouts && failures && held) {
    return "timeouts, failures and holds";
  } else if (timeouts && failures) {
    return "timeouts and failures";
  } else if (failures && held) {
    return "failures and holds";
  } else if (timeouts && held) {
    return "timeouts and holds";
  } else if (timeouts) {
    return "timeouts";
  } else if (failures) {
    return "failures";
  } else if (held) {
    return "holds";
  }

  throw new HardhatError(
    HardhatError.ERRORS.INTERNAL.ASSERTION_ERROR,
    {
      message: "Invariant violated: neither timeouts or failures",
    }
  );
}
