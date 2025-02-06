import chalk from "chalk";

import { requestSecretInput } from "../ui/request-secret-input.js";
import { UserDisplayMessages } from "../ui/user-display-messages.js";

import { createMasterKey } from "./encryption.js";

export async function setUpPasswordAndComputeMasterKey(
  consoleLog: (text: string) => void = console.log,
  requestSecretFromUser: (
    requestText: string,
  ) => Promise<string> = requestSecretInput,
): Promise<{
  salt: Uint8Array;
  masterKey: Uint8Array;
}> {
  // const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[\W_]).{8,}$/; // TODO: change password rule
  const PASSWORD_REGEX = /^.{8,}$/;

  consoleLog(UserDisplayMessages.keystoreBannerMessage()); // TODO: maybe move this to a different file

  consoleLog(UserDisplayMessages.passwordSetUpMessage());
  consoleLog(UserDisplayMessages.passwordRequirementsMessage());
  consoleLog("");

  let password: string | undefined;

  while (password === undefined) {
    password = await requestSecretFromUser(
      UserDisplayMessages.enterPasswordMsg(),
    );

    if (!PASSWORD_REGEX.test(password)) {
      password = undefined;
      consoleLog(chalk.red(UserDisplayMessages.passwordRequirementsError()));
    }
  }

  let confirmPassword: string | undefined;
  while (confirmPassword === undefined) {
    confirmPassword = await requestSecretFromUser(
      UserDisplayMessages.confirmPasswordMessage(),
    );

    if (password !== confirmPassword) {
      consoleLog(chalk.red(UserDisplayMessages.passwordsDoNotMatchError()));
      confirmPassword = undefined;
    }
  }

  return createMasterKey({ password });
}

export async function askPasswordAndComputeMasterKey(
  requestSecretFromUser: (
    requestText: string,
  ) => Promise<string> = requestSecretInput,
): Promise<{
  salt: Uint8Array;
  masterKey: Uint8Array;
}> {
  const password = await requestSecretFromUser(
    UserDisplayMessages.enterPasswordMsg(),
  );

  return createMasterKey({ password });
}
