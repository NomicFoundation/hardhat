import chalk from "chalk";

import { PLUGIN_ID } from "../constants.js";
import { UserDisplayMessages } from "../ui/user-display-messages.js";

export async function setUpPassword(
  requestSecretInput: (
    interruptor: string,
    inputDescription: string,
  ) => Promise<string>,
  consoleLog: (text: string) => void = console.log,
): Promise<string> {
  consoleLog(UserDisplayMessages.keystoreBannerMessage());

  consoleLog(UserDisplayMessages.passwordSetUpMessage());
  consoleLog(UserDisplayMessages.passwordRequirementsMessage());
  consoleLog("");

  return createPassword(requestSecretInput, consoleLog);
}

export async function setNewPassword(
  requestSecretInput: (
    interruptor: string,
    inputDescription: string,
  ) => Promise<string>,
  consoleLog: (text: string) => void = console.log,
): Promise<string> {
  consoleLog(UserDisplayMessages.passwordChangeMessage());
  consoleLog(UserDisplayMessages.passwordRequirementsMessage());
  consoleLog("");

  return createPassword(requestSecretInput, consoleLog);
}

export async function askPassword(
  requestSecretInput: (
    interruptor: string,
    inputDescription: string,
  ) => Promise<string>,
): Promise<string> {
  return requestSecretInput(PLUGIN_ID, UserDisplayMessages.enterPasswordMsg());
}

async function createPassword(
  requestSecretInput: (
    interruptor: string,
    inputDescription: string,
  ) => Promise<string>,
  consoleLog: (text: string) => void = console.log,
) {
  const PASSWORD_REGEX = /^.{8,}$/;

  let password: string | undefined;

  while (password === undefined) {
    password = await requestSecretInput(
      PLUGIN_ID,
      UserDisplayMessages.enterPasswordMsg(),
    );

    if (!PASSWORD_REGEX.test(password)) {
      password = undefined;
      consoleLog(chalk.red(UserDisplayMessages.passwordRequirementsError()));
    }
  }

  let confirmPassword: string | undefined;
  while (confirmPassword === undefined) {
    confirmPassword = await requestSecretInput(
      PLUGIN_ID,
      UserDisplayMessages.confirmPasswordMessage(),
    );

    if (password !== confirmPassword) {
      consoleLog(chalk.red(UserDisplayMessages.passwordsDoNotMatchError()));
      confirmPassword = undefined;
    }
  }

  return password;
}
