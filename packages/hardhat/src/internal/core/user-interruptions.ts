import type { HookContext, HookManager } from "../../types/hooks.js";
import type { UserInterruptionManager } from "../../types/user-interruptions.js";
import type { Interface } from "node:readline";

import { createInterface } from "node:readline";
import { styleText } from "node:util";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import { AsyncMutex } from "@nomicfoundation/hardhat-utils/synchronization";

export class UserInterruptionManagerImplementation implements UserInterruptionManager {
  readonly #hooks;
  readonly #mutex = new AsyncMutex();

  constructor(hooks: HookManager) {
    this.#hooks = hooks;
  }

  public async displayMessage(
    interruptor: string,
    message: string,
  ): Promise<void> {
    return await this.#mutex.exclusiveRun(async () => {
      return await this.#hooks.runHandlerChain(
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
    return await this.#mutex.exclusiveRun(async () => {
      return await this.#hooks.runHandlerChain(
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
    return await this.#mutex.exclusiveRun(async () => {
      return await this.#hooks.runHandlerChain(
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
    return await this.#mutex.exclusiveRun(f);
  }
}

async function defaultDisplayMessage(
  _context: HookContext,
  interruptor: string,
  message: string,
) {
  console.log(styleText("blue", `[${interruptor}]`) + ` ${message}`);
}

async function defaultRequestInput(
  _context: HookContext,
  interruptor: string,
  inputDescription: string,
): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return await askQuestion(rl, interruptor, inputDescription);
}

async function defaultRequestSecretInput(
  _context: HookContext,
  interruptor: string,
  inputDescription: string,
): Promise<string> {
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
        "Expected readline output to be defined",
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

  return await askQuestion(rl, interruptor, inputDescription);
}

/**
 * Asks the user for input through the given readline interface.
 *
 * If the interface closes before an answer arrives (e.g. stdin reaches EOF, or
 * the user cancels the prompt) it throws instead of never settling.
 */
async function askQuestion(
  rl: Interface,
  interruptor: string,
  inputDescription: string,
): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    let prompted = false;
    let answered = false;

    rl.once("close", () => {
      if (answered) {
        return;
      }

      // The prompt doesn't end with a newline, so we print one to keep the
      // error off the prompt's line
      if (prompted) {
        process.stdout.write("\n");
      }

      reject(
        new HardhatError(
          HardhatError.ERRORS.CORE.GENERAL.PROMPT_CLOSED_BEFORE_ANSWER,
          { interruptor },
        ),
      );
    });

    // If a previous prompt already read stdin's EOF, readline won't receive
    // another "end" event, so we close the interface ourselves.
    if (process.stdin.readableEnded) {
      rl.close();
      return;
    }

    prompted = true;
    rl.question(
      styleText("blue", `[${interruptor}]`) + ` ${inputDescription}: `,
      (answer) => {
        answered = true;
        resolve(answer);
        rl.close();
      },
    );
  });
}
