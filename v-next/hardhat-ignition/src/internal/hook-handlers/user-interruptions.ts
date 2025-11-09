import type { UserInterruptionHooks } from "hardhat/types/hooks";

import process from "node:process";

import { sleep } from "@nomicfoundation/hardhat-utils/lang";

const WAIT_MESSAGE_TIME_SECS = 10;
const AVOID_FLICKERING_TIME_SECS = 1;

function markPosition() {
  if (process.stdout.isTTY) {
    process.stdout.write("\x1b7"); // Save cursor position
  }
}

function restoreAndClearBelow() {
  if (!process.stdout.isTTY) {
    return;
  }

  process.stdout.write("\x1b8"); // ESC 8 — restore cursor
  process.stdout.write("\x1b[J"); // ESC [J — clear from cursor to end of screen
}

export function getUserInterruptionsHandlers(): UserInterruptionHooks {
  return {
    async displayMessage(context, interruptor, message, next): Promise<void> {
      markPosition();

      const returnValue = await next(context, interruptor, message);

      // If we are going to clear the message out, we wait some time before
      // doing it, so that the user can read it.
      if (process.stdout.isTTY) {
        await sleep(WAIT_MESSAGE_TIME_SECS);
      }

      restoreAndClearBelow();

      return returnValue;
    },
    async requestInput(
      context,
      interruptor,
      inputDescription,
      next,
    ): Promise<string> {
      markPosition();

      const returnValue = await next(context, interruptor, inputDescription);

      // If we are going to clear the terminal, we wait a small time so it
      // doesn't look like flickering
      if (process.stdout.isTTY) {
        await sleep(AVOID_FLICKERING_TIME_SECS);
      }

      restoreAndClearBelow();

      return returnValue;
    },
    async requestSecretInput(
      context,
      interruptor,
      inputDescription,
      next,
    ): Promise<string> {
      markPosition();

      const returnValue = await next(context, interruptor, inputDescription);

      // If we are going to clear the terminal, we wait a small time so it
      // doesn't look like flickering
      if (process.stdout.isTTY) {
        await sleep(AVOID_FLICKERING_TIME_SECS);
      }

      restoreAndClearBelow();

      return returnValue;
    },
  };
}
