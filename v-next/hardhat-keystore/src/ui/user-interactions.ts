import type { UserInteractions } from "../types.js";
import type { UserInterruptionManager } from "@ignored/hardhat-vnext/types/user-interruptions";

import chalk from "chalk";

import { PLUGIN_ID } from "../constants.js";

export class UserInteractionsImpl implements UserInteractions {
  readonly #userInterruptions: UserInterruptionManager;

  constructor(userInterruptions: UserInterruptionManager) {
    this.#userInterruptions = userInterruptions;
  }

  public async setUpPassword(): Promise<void> {
    const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[\W_]).{8,}$/;

    const setupMsg =
      "This is the first time you are using the keystore, please set a password.";
    const passwordRulesMsg =
      "The password must have at least 8 characters, one uppercase letter, one lowercase letter, and one special character.";

    await this.#displayMessage("\n👷🔐 Hardhat-Keystore 🔐👷\n");
    await this.#displayMessage(setupMsg);
    await this.#displayMessage(passwordRulesMsg);
    await this.#displayMessage("");

    let password: string | undefined;

    while (password === undefined) {
      password = await this.#requestSecretInput(`Enter your password: `);

      if (!PASSWORD_REGEX.test(password)) {
        password = undefined;
        await this.#displayMessage(chalk.red("Invalid password!"));
      }
    }

    let confirmPassword: string | undefined;
    while (confirmPassword === undefined) {
      confirmPassword = await this.#requestSecretInput(
        "Please confirm your password: ",
      );

      if (password !== confirmPassword) {
        await this.#displayMessage(chalk.red("Passwords do not match!"));
        confirmPassword = undefined;
      }
    }
  }

  public async requestSecretFromUser(): Promise<string> {
    return this.#requestSecretInput("Enter secret to store: ");
  }

  public async displayInvalidKeyErrorMessage(key: string): Promise<void> {
    await this.#displayMessage(
      chalk.red(
        `Invalid value for key: "${key}". Keys can only have alphanumeric characters and underscores, and they cannot start with a number.`,
      ),
    );
  }

  public async displayKeyNotFoundErrorMessage(key: string): Promise<void> {
    await this.#displayMessage(chalk.red(`Key "${key}" not found`));
  }

  public async displayNoKeystoreSetErrorMessage(): Promise<void> {
    await this.#displayMessage(
      `No keystore found. Please set one up using ${chalk.blue.italic("npx hardhat keystore set {key}")} `,
    );
  }

  public async displaySecretCannotBeEmptyErrorMessage(): Promise<void> {
    await this.#displayMessage(chalk.red("The value cannot be empty."));
  }

  public async displayKeyAlreadyExistsWarning(key: string): Promise<void> {
    await this.#displayMessage(
      chalk.yellow(
        `The key "${key}" already exists. Use the ${chalk.blue.italic("--force")} flag to overwrite it.`,
      ),
    );
  }

  public async displayKeyListInfoMessage(keys: string[]): Promise<void> {
    await this.#displayMessage("Keys:");
    for (const key of keys) {
      await this.#displayMessage(key);
    }
  }

  public async displayKeyRemovedInfoMessage(key: string): Promise<void> {
    await this.#displayMessage(`Key "${key}" removed`);
  }

  public async displayKeySetInfoMessage(key: string): Promise<void> {
    await this.#displayMessage(`Key "${key}" set`);
  }

  public async displayNoKeysInfoMessage(): Promise<void> {
    await this.#displayMessage("The keystore does not contain any keys.");
  }

  public async displayValueInfoMessage(value: string): Promise<void> {
    await this.#displayMessage(value);
  }

  async #displayMessage(message: string): Promise<void> {
    await this.#userInterruptions.displayMessage(PLUGIN_ID, message);
  }

  async #requestSecretInput(inputDescription: string): Promise<string> {
    return this.#userInterruptions.requestSecretInput(
      PLUGIN_ID,
      inputDescription,
    );
  }
}
