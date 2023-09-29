import chalk from "chalk";

import { UiState } from "../types";

import { displaySeparator } from "./display-separator";

export function displayDeployingModulePanel(state: UiState) {
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  console.log("");
  console.log(
    chalk.bold(
      `Deploying module ${chalk.italic(state.moduleName ?? "unknown")}`
    )
  );
  console.log("");
  displaySeparator();
  console.log("");
}
