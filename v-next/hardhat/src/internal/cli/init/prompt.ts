import type { Template } from "./template.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { shortenPath } from "@nomicfoundation/hardhat-utils/path";
import chalk from "chalk";

export async function promptForHardhatVersion(): Promise<
  "hardhat-2" | "hardhat-3"
> {
  ensureTTY();

  const { default: enquirer } = await import("enquirer");

  const hardhatVersionResponse = await enquirer.prompt<{
    hardhatVersion: "hardhat-2" | "hardhat-3";
  }>([
    {
      name: "hardhatVersion",
      type: "select",
      message: "Which version of Hardhat would you like to use?",
      initial: 0,
      choices: [
        {
          name: "hardhat-3",
          message: "Hardhat 3 Beta (recommended for new projects)",
          value: "hardhat-3",
        },
        {
          name: "hardhat-2",
          message: "Hardhat 2 (older version)",
          value: "hardhat-2",
        },
      ],
    },
  ]);

  return hardhatVersionResponse.hardhatVersion;
}

export async function promptForWorkspace(): Promise<string> {
  ensureTTY();

  const { default: enquirer } = await import("enquirer");

  const workspaceResponse = await enquirer.prompt<{ workspace: string }>([
    {
      name: "workspace",
      type: "input",
      message: `Where would you like to initialize the project?\n\nPlease provide either a relative or an absolute path:`,
      initial: ".",
    },
  ]);

  return workspaceResponse.workspace;
}

export async function promptForMigrateToEsm(
  absolutePathToPackageJson: string,
): Promise<boolean> {
  ensureTTY();

  const { default: enquirer } = await import("enquirer");

  const migrateToEsmResponse = await enquirer.prompt<{ migrateToEsm: boolean }>(
    [
      {
        name: "migrateToEsm",
        type: "confirm",
        message: `Hardhat only supports ESM projects. Would you like to change "${shortenPath(absolutePathToPackageJson)}" to turn your project into ESM?`,
        initial: true,
      },
    ],
  );

  return migrateToEsmResponse.migrateToEsm;
}

export async function promptForTemplate(
  templates: Template[],
): Promise<string> {
  ensureTTY();

  const { default: enquirer } = await import("enquirer");

  const templateResponse = await enquirer.prompt<{ template: string }>([
    {
      name: "template",
      type: "select",
      message: "What type of project would you like to initialize?",
      initial: 0,
      choices: templates.map((template) => ({
        name: template.name,
        message: template.packageJson.description,
        value: template.name,
      })),
    },
  ]);

  return templateResponse.template;
}

export async function promptForForce(files: string[]): Promise<boolean> {
  ensureTTY();

  const { default: enquirer } = await import("enquirer");

  const forceResponse = await enquirer.prompt<{ force: boolean }>([
    {
      name: "force",
      type: "confirm",
      message: `The following files already exist in the workspace:\n${files.map((f) => `- ${f}`).join("\n")}\n\nDo you want to overwrite them?`,
      initial: false,
    },
  ]);

  return forceResponse.force;
}

export async function promptForInstall(
  safelyFormattedCommand: string,
): Promise<boolean> {
  ensureTTY();

  const { default: enquirer } = await import("enquirer");

  const installResponse = await enquirer.prompt<{ install: boolean }>([
    {
      name: "install",
      type: "confirm",
      message: `You need to install the necessary dependencies using the following command:\n${chalk.italic(safelyFormattedCommand)}\n\nDo you want to run it now?`,
      initial: true,
    },
  ]);

  return installResponse.install;
}

export async function promptForUpdate(
  safelyFormattedCommand: string,
): Promise<boolean> {
  ensureTTY();

  const { default: enquirer } = await import("enquirer");

  const updateResponse = await enquirer.prompt<{ update: boolean }>([
    {
      name: "update",
      type: "confirm",
      message: `You need to update the following dependencies using the following command:\n${chalk.italic(safelyFormattedCommand)}\n\nDo you want to run it now?`,
      initial: true,
    },
  ]);

  return updateResponse.update;
}

/**
 * ensureTTY checks if the process is running in a TTY (i.e. a terminal).
 * If it is not, it throws and error.
 */
function ensureTTY(): void {
  if (process.stdout.isTTY !== true) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.GENERAL.NOT_IN_INTERACTIVE_SHELL,
    );
  }

  let a = "";
  a = a.replaceAll(`\${${i}}`, i)
}
