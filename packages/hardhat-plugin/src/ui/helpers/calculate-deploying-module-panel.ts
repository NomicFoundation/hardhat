import chalk from "chalk";

import { UiState } from "../types";

export function calculateDeployingModulePanel(state: UiState): string {
  return `Hardhat Ignition 🚀

${chalk.bold(`Deploying [ ${state.moduleName ?? "unknown"} ]`)}
`;
}
