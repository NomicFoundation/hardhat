import chalk from "chalk";

import { getKeystoreType } from "../utils/get-keystore-type.js";

export class UserDisplayMessages {
  public static displayInvalidKeyErrorMessage(key: string): string {
    return chalk.red(
      `Invalid value for key: "${key}". Keys can only have alphanumeric characters and underscores, and they cannot start with a number.`,
    );
  }

  public static displayKeyAlreadyExistsWarning(
    key: string,
    dev: boolean,
  ): string {
    return chalk.yellow(
      `The key "${key}" already exists in the ${getKeystoreType(dev)} keystore. Use the ${chalk.blue.italic("--force")} flag to overwrite it.`,
    );
  }

  public static displayKeyListInfoMessage(
    keys: string[],
    dev: boolean,
  ): string {
    let output = `Keys in the ${getKeystoreType(dev)} keystore:`;

    for (const key of keys) {
      output += `\n${key}`;
    }

    return output + "\n";
  }

  public static displayKeyNotFoundErrorMessage(
    key: string,
    dev: boolean,
  ): string {
    return chalk.red(
      `Key "${key}" not found in the ${getKeystoreType(dev)} keystore`,
    );
  }

  public static displayKeyRemovedInfoMessage(
    key: string,
    dev: boolean,
  ): string {
    return `Key "${key}" deleted from the ${getKeystoreType(dev)} keystore`;
  }

  public static displayKeySetInfoMessage(key: string, dev: boolean): string {
    return `Key "${key}" set in the ${getKeystoreType(dev)} keystore`;
  }

  public static displayNoKeysInfoMessage(dev: boolean): string {
    return `The ${getKeystoreType(dev)} keystore does not contain any keys.`;
  }

  public static displayNoKeystoreSetErrorMessage(dev: boolean): string {
    return `No ${getKeystoreType(dev)} keystore found. Please set one up using ${chalk.blue.italic(`npx hardhat keystore set {key}${dev === true ? " --dev" : ""}`)} `;
  }

  public static displaySecretCannotBeEmptyErrorMessage(): string {
    return chalk.red("The value cannot be empty.");
  }

  public static displayValueInfoMessage(value: string): string {
    return `${value}`;
  }

  public static enterSecretMessage(dev: boolean): string {
    return `Enter secret to store in the ${getKeystoreType(dev)} keystore`;
  }

  public static keystoreBannerMessage(): string {
    return "\n👷🔐 Hardhat Production Keystore 🔐👷\n";
  }

  public static passwordSetUpMessage(): string {
    return "This is the first time you are using the production keystore, please set a password.";
  }

  public static unlockBeforePasswordChangeMessage(): string {
    return "Unlock the production keystore using your current password before proceeding with the password change.";
  }

  public static passwordChangeMessage(): string {
    return "Change your password.";
  }

  public static passwordChangedSuccessMessage(): string {
    return "Password changed successfully!";
  }

  public static passwordRequirementsMessage(): string {
    // return "The password must have at least 8 characters, one uppercase letter, one lowercase letter, and one special character.";
    return "The password must have at least 8 characters.";
  }

  public static enterPasswordMsg(): string {
    return "Enter the password";
  }

  public static passwordRequirementsError(): string {
    return "Invalid password! It does not meet the required criteria.";
  }

  public static confirmPasswordMessage(): string {
    return "Please confirm your password";
  }

  public static passwordsDoNotMatchError(): string {
    return "Passwords do not match!";
  }
}
