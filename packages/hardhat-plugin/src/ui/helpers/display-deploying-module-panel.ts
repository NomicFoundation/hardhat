import chalk from "chalk";

import { UiState } from "../types";

export function displayDeployingModulePanel(state: UiState) {
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  console.log("");
  console.log(`Hardhat Ignition 🚀`);
  console.log("");
  console.log(chalk.bold(`Deploying [ ${state.moduleName ?? "unknown"} ]`));
  console.log("");
}
