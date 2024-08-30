import type { RawInterruptions } from "../types.js";
import type { HookContext } from "@ignored/hardhat-vnext/types/hooks";

import { HardhatPluginError } from "@ignored/hardhat-vnext-errors";
import chalk from "chalk";

import { PLUGIN_ID } from "../constants.js";

export class RawInterruptionsImpl implements RawInterruptions {
  public async info(message: string): Promise<void> {
    console.log(message);
  }

  public async warn(message: string): Promise<void> {
    console.info(chalk.yellow(message));
  }

  public async error(message: string): Promise<void> {
    console.error(chalk.red(message));
  }

  public async requestSecretInput(inputDescription: string): Promise<string> {
    const { createInterface } = await import("node:readline");

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
    We need to access a private property of the readline interface. */
    const rlAsAny = rl as any;

    let initialMessage: string | undefined;

    rlAsAny._writeToOutput = (out: string) => {
      if (initialMessage === undefined || out.length !== 1) {
        if (initialMessage === undefined) {
          initialMessage = out;
        }

        if (rlAsAny.output === undefined) {
          throw new HardhatPluginError(
            PLUGIN_ID,
            "Expected readline output to be defined",
          );
        }

        // We show the initial message as is
        if (out.startsWith(initialMessage)) {
          rlAsAny.output.write(initialMessage);
          out = out.slice(initialMessage.length);
        } else if (out.trim() === "") {
          rlAsAny.output.write(out);
          out = "";
        }
      }

      // We show the rest of the chars as "*"
      for (const _ of out) {
        rlAsAny.output.write("*");
      }
    };

    return new Promise<string>((resolve) => {
      rl.question(inputDescription, (answer) => {
        resolve(answer);
        rl.close();
      });
    });
  }

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
    return this.requestSecretInput("Enter secret to store: ");
  }
}

export class HookRawInterruptionsImpl implements RawInterruptions {
  readonly #context: HookContext;

  constructor(context: HookContext) {
    this.#context = context;
  }

  public async info(message: string): Promise<void> {
    await this.#context.interruptions.displayMessage(PLUGIN_ID, message);
  }

  public async warn(): Promise<void> {
    throw new HardhatPluginError(PLUGIN_ID, "this should not be called");
  }

  public async error(message: string): Promise<void> {
    await this.#context.interruptions.displayMessage(
      PLUGIN_ID,
      chalk.red(message),
    );
  }

  public async requestSecretInput(): Promise<string> {
    throw new HardhatPluginError(PLUGIN_ID, "this should not be called");
  }

  public async displayNoKeystoreSetErrorMessage(
    _interruptions: RawInterruptions,
  ): Promise<void> {
    throw new HardhatPluginError(PLUGIN_ID, "this should not be called");
  }

  public async displayKeyNotFoundErrorMessage(_key: string): Promise<void> {
    throw new HardhatPluginError(PLUGIN_ID, "this should not be called");
  }

  public async displayKeyRemovedInfoMessage(_key: string): Promise<void> {
    throw new HardhatPluginError(PLUGIN_ID, "this should not be called");
  }

  public async displayValueInfoMessage(_value: string): Promise<void> {
    throw new HardhatPluginError(PLUGIN_ID, "this should not be called");
  }

  public async displayNoKeysInfoMessage(): Promise<void> {
    throw new HardhatPluginError(PLUGIN_ID, "this should not be called");
  }

  public async displayKeyListInfoMessage(_keys: string[]): Promise<void> {
    throw new HardhatPluginError(PLUGIN_ID, "this should not be called");
  }

  public async displayInvalidKeyErrorMessage(_key: string): Promise<void> {
    throw new HardhatPluginError(PLUGIN_ID, "this should not be called");
  }

  public async displayKeyAlreadyExistsWarning(_key: string): Promise<void> {
    throw new HardhatPluginError(PLUGIN_ID, "this should not be called");
  }

  public async displaySecretCannotBeEmptyErrorMessage(): Promise<void> {
    throw new HardhatPluginError(PLUGIN_ID, "this should not be called");
  }

  public async displayKeySetInfoMessage(_key: string): Promise<void> {
    throw new HardhatPluginError(PLUGIN_ID, "this should not be called");
  }

  public async requestSecretFromUser(): Promise<string> {
    throw new HardhatPluginError(PLUGIN_ID, "this should not be called");
  }
}
