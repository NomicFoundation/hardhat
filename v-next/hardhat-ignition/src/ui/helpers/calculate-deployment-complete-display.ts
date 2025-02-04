import {
  DeploymentCompleteEvent,
  DeploymentResultType,
  ExecutionErrorDeploymentResult,
  PreviousRunErrorDeploymentResult,
  ReconciliationErrorDeploymentResult,
  SuccessfulDeploymentResult,
  ValidationErrorDeploymentResult,
} from "@ignored/hardhat-vnext-ignition-core";
import chalk from "chalk";

import { UiState } from "../types";

import { pathFromCwd } from "./cwd-relative-path";
import { wasAnythingExecuted } from "./was-anything-executed";

export function calculateDeploymentCompleteDisplay(
  event: DeploymentCompleteEvent,
  uiState: Pick<
    UiState,
    "moduleName" | "isResumed" | "batches" | "deploymentDir"
  >
): string {
  const moduleName = uiState.moduleName ?? "unknown";
  const isResumed = uiState.isResumed ?? false;

  switch (event.result.type) {
    case DeploymentResultType.SUCCESSFUL_DEPLOYMENT: {
      const isRerunWithNoChanges: boolean =
        isResumed && !wasAnythingExecuted(uiState);

      return _displaySuccessfulDeployment(event.result, {
        moduleName,
        isRerunWithNoChanges,
        deploymentDir: uiState.deploymentDir,
      });
    }
    case DeploymentResultType.VALIDATION_ERROR: {
      return _displayValidationErrors(event.result, { moduleName });
    }
    case DeploymentResultType.RECONCILIATION_ERROR: {
      return _displayReconciliationErrors(event.result, { moduleName });
    }
    case DeploymentResultType.PREVIOUS_RUN_ERROR: {
      return _displayPreviousRunErrors(event.result, { moduleName });
    }
    case DeploymentResultType.EXECUTION_ERROR: {
      return _displayExecutionErrors(event.result, { moduleName });
    }
  }
}

function _displaySuccessfulDeployment(
  result: SuccessfulDeploymentResult,
  {
    moduleName,
    isRerunWithNoChanges,
    deploymentDir,
  }: {
    moduleName: string;
    isRerunWithNoChanges: boolean;
    deploymentDir: string | null | undefined;
  }
): string {
  const fillerText = isRerunWithNoChanges
    ? `Nothing new to deploy based on previous execution stored in ${pathFromCwd(
        deploymentDir ?? "Not provided"
      )}`
    : `successfully deployed 🚀`;

  let text = `[ ${moduleName} ] ${fillerText}

${chalk.bold("Deployed Addresses")}

`;

  const deployedContracts = Object.values(result.contracts);

  if (deployedContracts.length > 0) {
    text += deployedContracts
      .map((contract) => `${contract.id} - ${contract.address}`)
      .join("\n");
  } else {
    text += `${chalk.italic("No contracts were deployed")}`;
  }

  return text;
}

function _displayValidationErrors(
  result: ValidationErrorDeploymentResult,
  { moduleName }: { moduleName: string }
): string {
  let text = `[ ${moduleName} ] validation failed ⛔

The module contains futures that would fail to execute:

`;

  text += Object.entries(result.errors)
    .map(([futureId, errors]) => {
      let futureSection = `${futureId}:\n`;

      futureSection += errors.map((error) => ` - ${error}`).join("\n");

      return futureSection;
    })
    .join("\n\n");

  text += `\n\nUpdate the invalid futures and rerun the deployment.`;

  return text;
}

function _displayReconciliationErrors(
  result: ReconciliationErrorDeploymentResult,
  { moduleName }: { moduleName: string }
): string {
  let text = `[ ${moduleName} ] reconciliation failed ⛔

The module contains changes to executed futures:

`;

  text += Object.entries(result.errors)
    .map(([futureId, errors]) => {
      let errorSection = `${futureId}:\n`;

      errorSection += errors.map((error) => ` - ${error}`).join("\n");

      return errorSection;
    })
    .join("\n\n");

  text += `\n\nConsider modifying your module to remove the inconsistencies with deployed futures.`;

  return text;
}

function _displayPreviousRunErrors(
  result: PreviousRunErrorDeploymentResult,
  { moduleName }: { moduleName: string }
): string {
  let text = `[ ${moduleName} ] deployment cancelled ⛔\n\n`;

  text += `These futures failed or timed out on a previous run:\n`;

  text += Object.keys(result.errors)
    .map((futureId) => ` - ${futureId}`)
    .join("\n");

  text += `\n\nUse the ${chalk.italic("wipe")} task to reset them.`;

  return text;
}

function _displayExecutionErrors(
  result: ExecutionErrorDeploymentResult,
  { moduleName }: { moduleName: string }
) {
  const sections: string[] = [];

  let text = `[ ${moduleName} ] failed ⛔\n\n`;

  if (result.timedOut.length > 0) {
    let timedOutSection = `Futures timed out with transactions unconfirmed after maximum fee bumps:\n`;

    timedOutSection += Object.values(result.timedOut)
      .map(({ futureId }) => ` - ${futureId}`)
      .join("\n");

    sections.push(timedOutSection);
  }

  if (result.failed.length > 0) {
    let failedSection = `Futures failed during execution:\n`;

    failedSection += Object.values(result.failed)
      .map(({ futureId, error }) => ` - ${futureId}: ${error}`)
      .join("\n");

    failedSection +=
      "\n\nTo learn how to handle these errors: https://hardhat.org/ignition-errors";

    sections.push(failedSection);
  }

  if (result.held.length > 0) {
    let heldSection = `Held:\n`;

    heldSection += Object.values(result.held)
      .map(({ futureId, reason }) => ` - ${futureId}: ${reason}`)
      .join("\n");

    sections.push(heldSection);
  }

  text += sections.join("\n\n");

  return text;
}
