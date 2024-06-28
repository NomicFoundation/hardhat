import {
  HardhatError,
  HardhatPluginError,
} from "@nomicfoundation/hardhat-errors";
import chalk from "chalk";

export function handleErrors(error: unknown): void {
  let isHardhatError = false;

  if (HardhatError.isHardhatError(error)) {
    isHardhatError = true;
    console.error(
      chalk.red.bold("Error"),
      error.message.replace(/^\w+:/, (t) => chalk.red.bold(t)),
    );
  } else if (HardhatPluginError.isHardhatPluginError(error)) {
    isHardhatError = true;
    console.error(
      chalk.red.bold(`Error in plugin ${error.pluginName}:`),
      error.message,
    );
  } else if (error instanceof Error) {
    console.error(chalk.red("An unexpected error occurred:"));
    showStackTraces = true;
  } else {
    console.error(chalk.red("An unexpected error occurred."));
    showStackTraces = true;
  }

  console.log("");

  if (showStackTraces || SHOULD_SHOW_STACK_TRACES_BY_DEFAULT) {
    console.error(error);
  } else {
    if (!isHardhatError) {
      console.error(
        `If you think this is a bug in Hardhat, please report it here: https://hardhat.org/report-bug`,
      );
    }

    if (HardhatError.isHardhatError(error)) {
      const link = `https://hardhat.org/${getErrorCode(error.errorDescriptor)}`;

      console.error(
        `For more info go to ${link} or run ${HARDHAT_NAME} with --show-stack-traces`,
      );
    } else {
      console.error(
        `For more info run ${HARDHAT_NAME} with --show-stack-traces`,
      );
    }
  }

  process.exit(1);
}
