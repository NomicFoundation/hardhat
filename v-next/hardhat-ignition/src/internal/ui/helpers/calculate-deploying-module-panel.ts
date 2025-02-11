import type { UiState } from "../types.js";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";
import chalk from "chalk";

import { pathFromCwd } from "./cwd-relative-path.js";

export function calculateDeployingModulePanel(state: UiState): string {
  let deployingMessage = `Hardhat Ignition 🚀

`;

  if (state.isResumed === true) {
    assertHardhatInvariant(
      state.deploymentDir !== null && state.deploymentDir !== undefined,
      "Deployment dir is undefined",
    );
    deployingMessage += `${chalk.bold(
      `Resuming existing deployment from ${pathFromCwd(state.deploymentDir)}`,
    )}

`;
  }

  deployingMessage += `${chalk.bold(
    `Deploying [ ${state.moduleName ?? "unknown"} ]${_calculateStrategySuffix(
      state,
    )}`,
  )}
`;

  if (state.warnings.length > 0) {
    deployingMessage += `\n${chalk.yellow(
      "Warning - previously executed futures are not in the module:",
    )}\n`;

    deployingMessage += state.warnings
      .map((futureId) => chalk.yellow(` - ${futureId}`))
      .join("\n");

    deployingMessage += "\n";
  }

  return deployingMessage;
}

function _calculateStrategySuffix(state: UiState) {
  if (state.strategy === "basic") {
    return "";
  }

  return ` with strategy ${state.strategy ?? "unknown"}`;
}
