import { StatusResult } from "@nomicfoundation/ignition-core";
import chalk from "chalk";

export function calculateDeploymentStatusDisplay(
  deploymentId: string,
  statusResult: StatusResult
): string {
  if (statusResult.started.length > 0) {
    return _calculateStartedButUnfinished(deploymentId, statusResult);
  }

  if (
    statusResult.timedOut.length > 0 ||
    statusResult.failed.length > 0 ||
    statusResult.held.length > 0
  ) {
    return _calculateFailed(deploymentId, statusResult);
  }

  return _calculateSuccess(deploymentId, statusResult);
}

function _calculateSuccess(deploymentId: string, statusResult: StatusResult) {
  let successText = `\n[ ${deploymentId} ] successfully deployed 🚀\n\n`;

  if (Object.values(statusResult.contracts).length === 0) {
    successText += chalk.italic("No contracts were deployed");
  } else {
    successText += `${chalk.bold("Deployed Addresses")}\n\n`;

    successText += Object.values(statusResult.contracts)
      .map((contract) => `${contract.id} - ${contract.address}`)
      .join("\n");
  }

  return successText;
}

function _calculateStartedButUnfinished(
  deploymentId: string,
  statusResult: StatusResult
) {
  let startedText = `\n[ ${deploymentId} ] has futures that have started but not finished ⛔\n\n`;

  startedText += Object.values(statusResult.started)
    .map((futureId) => ` - ${futureId}`)
    .join("\n");

  return startedText;
}

function _calculateFailed(deploymentId: string, statusResult: StatusResult) {
  let failedExecutionText = `\n[ ${deploymentId} ] failed ⛔\n`;

  const sections: string[] = [];

  if (statusResult.timedOut.length > 0) {
    let timedOutSection = `\nTransactions remain unconfirmed after fee bump:\n`;

    timedOutSection += Object.values(statusResult.timedOut)
      .map(({ futureId }) => ` - ${futureId}`)
      .join("\n");

    timedOutSection += "\n\nConsider increasing the fee in your config.";

    sections.push(timedOutSection);
  }

  if (statusResult.failed.length > 0) {
    let failedSection = `\nFutures failed during execution:\n`;

    failedSection += Object.values(statusResult.failed)
      .map(
        ({ futureId, networkInteractionId, error }) =>
          ` - ${futureId}/${networkInteractionId}: ${error}`
      )
      .join("\n");

    failedSection +=
      "\n\nConsider addressing the cause of the errors and rerunning the deployment.";

    sections.push(failedSection);
  }

  if (statusResult.held.length > 0) {
    let heldSection = `\nFutures where held by the strategy:\n`;

    heldSection += Object.values(statusResult.held)
      .map(
        ({ futureId, heldId, reason }) => ` - ${futureId}/${heldId}: ${reason}`
      )
      .join("\n");

    sections.push(heldSection);
  }

  failedExecutionText += sections.join("\n");

  return failedExecutionText;
}
