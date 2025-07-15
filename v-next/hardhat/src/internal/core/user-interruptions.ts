import type { HookContext, HookManager } from "../../types/hooks.js";
import type { UserInterruptionManager } from "../../types/user-interruptions.js";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";

import { AsyncMutex } from "./async-mutex.js";

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
    return this.#mutex.exclusiveRun(async () => {
      return this.#hooks.runHandlerChain(
        "userInterruptions",
        "displayMessage",
        [interruptor, message],
        defaultDisplayMessage,
      );
    });
  }

  public async requestInput(
    interruptor: string,
    inputDescription: string,
  ): Promise<string> {
    return this.#mutex.exclusiveRun(async () => {
      return this.#hooks.runHandlerChain(
        "userInterruptions",
        "requestInput",
        [interruptor, inputDescription],
        defaultRequestInput,
      );
    });
  }

  public async requestSecretInput(
    interruptor: string,
    inputDescription: string,
  ): Promise<string> {
    return this.#mutex.exclusiveRun(async () => {
      return this.#hooks.runHandlerChain(
        "userInterruptions",
        "requestSecretInput",
        [interruptor, inputDescription],
        defaultRequestSecretInput,
      );
    });
  }

  public async uninterrupted<ReturnT>(
    f: () => ReturnT,
  ): Promise<Awaited<ReturnT>> {
    return this.#mutex.exclusiveRun(f);
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
