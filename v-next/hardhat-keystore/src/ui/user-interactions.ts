import type { ConsoleWrapper, UserInteractions } from "../types.js";

import chalk from "chalk";

export class UserInteractionsImpl implements UserInteractions {
  readonly #console: ConsoleWrapper;

  constructor(console: ConsoleWrapper) {
    this.#console = console;
  }

  public async setUpPassword(): Promise<void> {
    const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[\W_]).{8,}$/;

    const setupMsg =
      "This is the first time you are using the keystore, please set a password.";
    const passwordRulesMsg =
      "The password must have at least 8 characters, one uppercase letter, one lowercase letter, and one special character.";

    this.#console.info("\n👷🔐 Hardhat-Keystore 🔐👷\n");
    this.#console.info(setupMsg);
    this.#console.info(passwordRulesMsg);
    this.#console.info("");

    let password: string | undefined;

    while (password === undefined) {
      password = await this.#console.requestSecretInput(
        `Enter your password: `,
      );

      if (!PASSWORD_REGEX.test(password)) {
        password = undefined;
        this.#console.error("Invalid password!");
      }
    }

    let confirmPassword: string | undefined;
    while (confirmPassword === undefined) {
      confirmPassword = await this.#console.requestSecretInput(
        "Please confirm your password: ",
      );

      if (password !== confirmPassword) {
        this.#console.error("Passwords do not match!");
        confirmPassword = undefined;
      }
    }
  }

  public async displayNoKeystoreSetErrorMessage(): Promise<void> {
    this.#console.info(
      `No keystore found. Please set one up using ${chalk.blue.italic("npx hardhat keystore set {key}")} `,
    );
  }

  public async displayKeyNotFoundErrorMessage(key: string): Promise<void> {
    this.#console.error(`Key "${key}" not found`);
  }

  public async displayKeyRemovedInfoMessage(key: string): Promise<void> {
    this.#console.info(`Key "${key}" removed`);
  }

  public async displayValueInfoMessage(value: string): Promise<void> {
    this.#console.info(value);
  }

  public async displayNoKeysInfoMessage(): Promise<void> {
    this.#console.info("The keystore does not contain any keys.");
  }

  public async displayKeyListInfoMessage(keys: string[]): Promise<void> {
    this.#console.info("Keys:");
    for (const key of keys) {
      this.#console.info(key);
    }
  }

  public async displayInvalidKeyErrorMessage(key: string): Promise<void> {
    this.#console.error(
      `Invalid value for key: "${key}". Keys can only have alphanumeric characters and underscores, and they cannot start with a number.`,
    );
  }

  public async displayKeyAlreadyExistsWarning(key: string): Promise<void> {
    this.#console.warn(
      `The key "${key}" already exists. Use the ${chalk.blue.italic("--force")} flag to overwrite it.`,
    );
  }

  public async displaySecretCannotBeEmptyErrorMessage(): Promise<void> {
    this.#console.error("The value cannot be empty.");
  }

  public async displayKeySetInfoMessage(key: string): Promise<void> {
    this.#console.info(`Key "${key}" set`);
  }

  public async requestSecretFromUser(): Promise<string> {
    return this.#console.requestSecretInput("Enter secret to store: ");
  }
}
