import type {
  KeystoreConsoleLog,
  KeystoreRequestSecretInput,
} from "../types.js";

import { randomBytes } from "node:crypto";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { readUtf8File, writeUtf8File } from "@nomicfoundation/hardhat-utils/fs";
import chalk from "chalk";

import { PLUGIN_ID } from "../constants.js";
import { UserDisplayMessages } from "../ui/user-display-messages.js";

export function getPasswordHandlers(
  requestSecretInput: KeystoreRequestSecretInput,
  consoleLog: KeystoreConsoleLog,
  isDevKeystore: boolean,
  devPasswordFilePath: string,
): {
  setUpPassword: () => Promise<string>;
  askPassword: () => Promise<string>;
  setNewPassword: (password: string) => Promise<string>;
} {
  if (isDevKeystore) {
    return {
      setUpPassword: () => setUpPasswordForDevKeystore(devPasswordFilePath),
      askPassword: () => askPasswordForDevKeystore(devPasswordFilePath),
      setNewPassword: () => {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_KEYSTORE.GENERAL.CANNOT_CHANGED_PASSWORD_FOR_DEV_KEYSTORE,
        );
      },
    };
  }

  return {
    setUpPassword: () => setUpPassword(requestSecretInput, consoleLog),
    askPassword: () => askPassword(requestSecretInput),
    setNewPassword: () => setNewPassword(requestSecretInput, consoleLog),
  };
}

export async function setUpPassword(
  requestSecretInput: KeystoreRequestSecretInput,
  consoleLog: KeystoreConsoleLog = console.log,
): Promise<string> {
  consoleLog(UserDisplayMessages.keystoreBannerMessage());

  consoleLog(UserDisplayMessages.passwordSetUpMessage());
  consoleLog(UserDisplayMessages.passwordRequirementsMessage());
  consoleLog("");

  return createPassword(requestSecretInput, consoleLog);
}

export async function setUpPasswordForDevKeystore(
  devPasswordFilePath: string,
): Promise<string> {
  const password = randomBytes(16).toString("hex");

  await writeUtf8File(devPasswordFilePath, password);

  return password;
}

export async function setNewPassword(
  requestSecretInput: KeystoreRequestSecretInput,
  consoleLog: KeystoreConsoleLog = console.log,
): Promise<string> {
  consoleLog(UserDisplayMessages.passwordChangeMessage());
  consoleLog(UserDisplayMessages.passwordRequirementsMessage());
  consoleLog("");

  return createPassword(requestSecretInput, consoleLog);
}

export async function askPassword(
  requestSecretInput: KeystoreRequestSecretInput,
): Promise<string> {
  return requestSecretInput(PLUGIN_ID, UserDisplayMessages.enterPasswordMsg());
}

export async function askPasswordForDevKeystore(
  devPasswordFilePath: string,
): Promise<string> {
  return readUtf8File(devPasswordFilePath);
}

async function createPassword(
  requestSecretInput: KeystoreRequestSecretInput,
  consoleLog: KeystoreConsoleLog = console.log,
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
