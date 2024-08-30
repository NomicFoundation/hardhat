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
}
