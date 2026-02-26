import type { HookContext, HookManager } from "../../types/hooks.js";
import type {
  BatchedUserInterruptionManager,
  UserInterruptionManager,
} from "../../types/user-interruptions.js";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { AsyncMutex } from "@nomicfoundation/hardhat-utils/synchronization";

export class UserInterruptionManagerImplementation
  implements UserInterruptionManager
{
  readonly #hooks;
  readonly #mutex = new AsyncMutex();

  constructor(hooks: HookManager) {
    this.#hooks = hooks;
  }

  public async displayMessage(
    interruptor: string,
    message: string,
  ): Promise<void> {
    return this.#mutex.exclusiveRun(() =>
      this.#displayMessage(interruptor, message),
    );
  }

  public async requestInput(
    interruptor: string,
    inputDescription: string,
  ): Promise<string> {
    return this.#mutex.exclusiveRun(() =>
      this.#requestInput(interruptor, inputDescription),
    );
  }

  public async requestSecretInput(
    interruptor: string,
    inputDescription: string,
  ): Promise<string> {
    return this.#mutex.exclusiveRun(() =>
      this.#requestSecretInput(interruptor, inputDescription),
    );
  }

  public async uninterrupted<ReturnT>(
    f: () => ReturnT,
  ): Promise<Awaited<ReturnT>> {
    return this.#mutex.exclusiveRun(f);
  }

  public async withBatchedInterruptions<ReturnT>(
    f: (interruptions: BatchedUserInterruptionManager) => ReturnT,
  ): Promise<Awaited<ReturnT>> {
    return this.#mutex.exclusiveRun(() => {
      const interruptions: BatchedUserInterruptionManager = {
        displayMessage: (interruptor, message) =>
          this.#displayMessage(interruptor, message),
        requestInput: (interruptor, inputDescription) =>
          this.#requestInput(interruptor, inputDescription),
        requestSecretInput: (interruptor, inputDescription) =>
          this.#requestSecretInput(interruptor, inputDescription),
      };
      return f(interruptions);
    });
  }

  #displayMessage(interruptor: string, message: string): Promise<void> {
    return this.#hooks.runHandlerChain(
      "userInterruptions",
      "displayMessage",
      [interruptor, message],
      defaultDisplayMessage,
    );
  }

  #requestInput(
    interruptor: string,
    inputDescription: string,
  ): Promise<string> {
    return this.#hooks.runHandlerChain(
      "userInterruptions",
      "requestInput",
      [interruptor, inputDescription],
      defaultRequestInput,
    );
  }

  #requestSecretInput(
    interruptor: string,
    inputDescription: string,
  ): Promise<string> {
    return this.#hooks.runHandlerChain(
      "userInterruptions",
      "requestSecretInput",
      [interruptor, inputDescription],
      defaultRequestSecretInput,
    );
  }
}

async function defaultDisplayMessage(
  _context: HookContext,
  interruptor: string,
  message: string,
) {
  const chalk = (await import("chalk")).default;
  console.log(chalk.blue(`[${interruptor}]`) + ` ${message}`);
}

async function defaultRequestInput(
  _context: HookContext,
  interruptor: string,
  inputDescription: string,
): Promise<string> {
  const { createInterface } = await import("node:readline");
  const chalk = (await import("chalk")).default;
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise<string>((resolve) => {
    rl.question(
      chalk.blue(`[${interruptor}]`) + ` ${inputDescription}: `,
      (answer) => {
        resolve(answer);
        rl.close();
      },
    );
  });
}

async function defaultRequestSecretInput(
  _context: HookContext,
  interruptor: string,
  inputDescription: string,
): Promise<string> {
  const { createInterface } = await import("node:readline");
  const chalk = (await import("chalk")).default;
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

      assertHardhatInvariant(
        rlAsAny.output !== undefined,
        "Espected readline output to be defined",
      );

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
    rl.question(
      chalk.blue(`[${interruptor}]`) + ` ${inputDescription}: `,
      (answer) => {
        resolve(answer);
        rl.close();
      },
    );
  });
}
