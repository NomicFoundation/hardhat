import {
  DeploymentCompleteEvent,
  DeploymentResultType,
  ExecutionErrorDeploymentResult,
  PreviousRunErrorDeploymentResult,
  ReconciliationErrorDeploymentResult,
  SuccessfulDeploymentResult,
  ValidationErrorDeploymentResult,
} from "@nomicfoundation/ignition-core";
import chalk from "chalk";

import { UiState } from "../types";

export function displayDeploymentComplete(
  state: UiState,
  event: DeploymentCompleteEvent
) {
  switch (event.result.type) {
    case DeploymentResultType.SUCCESSFUL_DEPLOYMENT: {
      _displaySuccessfulDeployment(state, event.result);
      break;
    }
    case DeploymentResultType.VALIDATION_ERROR: {
      _displayValidationErrors(state, event.result);
      break;
    }
    case DeploymentResultType.RECONCILIATION_ERROR: {
      _displayReconciliationErrors(state, event.result);
      break;
    }
    case DeploymentResultType.PREVIOUS_RUN_ERROR: {
      _displayPreviousRunErrors(state, event.result);
      break;
    }
    case DeploymentResultType.EXECUTION_ERROR: {
      _displayExecutionErrors(state, event.result);
      break;
    }
  }
}

function _displaySuccessfulDeployment(
  state: UiState,
  result: SuccessfulDeploymentResult
) {
  console.log("");
  console.log(
    chalk.bold(
      `🚀 Deployment Complete for module ${chalk.italic(
        state.moduleName ?? "unknown"
      )}`
    )
  );
  console.log("");
  console.log("Deployed Addresses");
  console.log("");

  for (const contract of Object.values(result.contracts)) {
    console.log(`${contract.id} - ${contract.address}`);
  }
}

function _displayValidationErrors(
  state: UiState,
  result: ValidationErrorDeploymentResult
) {
  console.log("");
  console.log(
    chalk.bold(
      `⛔ Validation failed for module ${chalk.italic(
        state.moduleName ?? "unknown"
      )}`
    )
  );
  console.log("");

  for (const [futureId, errors] of Object.entries(result.errors)) {
    console.log(`${chalk.bold(futureId)} errors:`);
    console.log("");

    for (const error of errors) {
      console.log(` - ${error}`);
    }

    console.log("");
  }
}

function _displayReconciliationErrors(
  state: UiState,
  result: ReconciliationErrorDeploymentResult
) {
  console.log("");
  console.log(
    chalk.bold(
      `⛔ Reconciliation failed for module ${chalk.italic(
        state.moduleName ?? "unknown"
      )}`
    )
  );
  console.log("");

  for (const [futureId, errors] of Object.entries(result.errors)) {
    console.log(`${chalk.bold(futureId)} errors:`);
    console.log("");

    for (const error of errors) {
      console.log(` - ${error}`);
    }

    console.log("");
  }
}

function _displayPreviousRunErrors(
  state: UiState,
  result: PreviousRunErrorDeploymentResult
) {
  console.log("");
  console.log(
    chalk.bold(
      `⛔ Deployment cancelled due to failed or timed out futures on a previous run of module ${chalk.italic(
        state.moduleName ?? "unknown"
      )}`
    )
  );
  console.log("");
  console.log(
    `These futures will need to be rerun; use the ${chalk.italic(
      "wipe"
    )} task to reset them:`
  );
  console.log("");

  for (const [futureId] of Object.entries(result.errors)) {
    console.log(` - ${futureId}`);
  }
}

function _displayExecutionErrors(
  state: UiState,
  result: ExecutionErrorDeploymentResult
) {
  console.log("");
  console.log(
    chalk.bold(
      `⛔ Execution failed for module ${chalk.italic(
        state.moduleName ?? "unknown"
      )}`
    )
  );
  console.log("");

  if (result.timedOut.length > 0) {
    console.log(chalk.yellow("Timed out:"));
    console.log("");

    for (const { futureId } of Object.values(result.timedOut)) {
      console.log(` - ${futureId}`);
    }
  }

  if (result.failed.length > 0) {
    console.log(chalk.red("Failures:"));
    console.log("");

    for (const { futureId, networkInteractionId, error } of Object.values(
      result.failed
    )) {
      console.log(` - ${futureId}/${networkInteractionId}: ${error}`);
    }
  }

  if (result.held.length > 0) {
    console.log(chalk.yellow("Held:"));
    console.log("");

    for (const { futureId, heldId, reason } of Object.values(result.held)) {
      console.log(` - ${futureId}/${heldId}: ${reason}`);
    }
  }
}
