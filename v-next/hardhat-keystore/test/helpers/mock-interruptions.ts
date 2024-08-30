import type { RawInterruptions } from "../../src/types.js";
import type { Mock } from "node:test";

import { mock } from "node:test";

import chalk from "chalk";

export class MockInterruptions implements RawInterruptions {
  public async displayNoKeystoreSetErrorMessage(): Promise<void> {
    await this.info(
      `No keystore found. Please set one up using ${chalk.blue.italic("npx hardhat keystore set {key}")} `,
    );
  }

  public async displayKeyNotFoundErrorMessage(key: string): Promise<void> {
    await this.error(`Key "${key}" not found`);
  }

  public async displayKeyRemovedInfoMessage(key: string): Promise<void> {
    await this.info(`Key "${key}" removed`);
  }

  public async displayValueInfoMessage(value: string): Promise<void> {
    await this.info(value);
  }

  public async displayNoKeysInfoMessage(): Promise<void> {
    await this.info("The keystore does not contain any keys.");
  }

  public async displayKeyListInfoMessage(keys: string[]): Promise<void> {
    await this.info("Keys:");
    for (const key of keys) {
      await this.info(key);
    }
  }

  public async displayInvalidKeyErrorMessage(key: string): Promise<void> {
    await this.error(
      `Invalid value for key: "${key}". Keys can only have alphanumeric characters and underscores, and they cannot start with a number.`,
    );
  }

  public async displayKeyAlreadyExistsWarning(key: string): Promise<void> {
    await this.warn(
      `The key "${key}" already exists. Use the ${chalk.blue.italic("--force")} flag to overwrite it.`,
    );
  }

  public async displaySecretCannotBeEmptyErrorMessage(): Promise<void> {
    await this.error("The secret cannot be empty.");
  }

  public async displayKeySetInfoMessage(key: string): Promise<void> {
    await this.info(`Key "${key}" set`);
  }

  public async requestSecretFromUser(): Promise<string> {
    return this.requestSecretInput();
  }

  public info: Mock<(message: string) => Promise<void>> = mock.fn(
    async (_msg: string): Promise<void> => {},
  );

  public warn: Mock<(message: string) => Promise<void>> = mock.fn(
    async (_msg: string): Promise<void> => {},
  );

  public error: Mock<(message: string) => Promise<void>> = mock.fn(
    async (_msg: string): Promise<void> => {},
  );

  public requestSecretInput = async (): Promise<string> => {
    return "password";
  };
}
