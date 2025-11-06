import type { PrettyEventHandler } from "../../helpers.js";
import type { UserInterruptionHooks } from "hardhat/types/hooks";

import { stdin, stdout } from "node:process";

export async function getCursorPosition(): Promise<{
  row: number;
  col: number;
}> {
  return new Promise((resolve, reject) => {
    // TODO: Should we check that this is a TTY?
    // if (!stdin.isTTY || !stdout.isTTY) {
    //   return reject(new Error("Not a TTY"));
    // }

    // Save old settings
    const wasRaw = stdin.isRaw;

    const onData = (data: Buffer) => {
      const str = data.toString();
      const match = /\x1B\[(\d+);(\d+)R/.exec(str);
      if (match !== null) {
        cleanup();
        const position = { row: Number(match[1]), col: Number(match[2]) };

        console.error(position);

        resolve(position);
      }
    };

    const cleanup = () => {
      stdin.off("data", onData);
      if (!wasRaw) stdin.setRawMode?.(false);
      stdin.pause();
    };

    try {
      stdin.setRawMode(true);
      stdin.resume();
      stdin.on("data", onData);
      stdout.write("\x1B[6n");
    } catch (err) {
      cleanup();
      reject(err);
    }
  });
}

export function getUserInterruptionsHandlers(
  eventHandler: PrettyEventHandler,
): UserInterruptionHooks {
  return {
    async displayMessage(context, interruptor, message, next): Promise<void> {
      const originalPosition = await getCursorPosition();

      const returnValue = next(context, interruptor, message);

      const newPosition = await getCursorPosition();

      const externalLines = newPosition.row - originalPosition.row;

      eventHandler.externalLinesWritten += externalLines;

      // Wait a few seconds so the user can read the message
      const WAIT_MESSAGE_TIME_MS = 6_000;
      await new Promise((resolve) => setTimeout(resolve, WAIT_MESSAGE_TIME_MS));

      return returnValue;
    },
    async requestInput(
      context,
      interruptor,
      inputDescription,
      next,
    ): Promise<string> {
      const originalPosition = await getCursorPosition();

      const returnValue = next(context, interruptor, inputDescription);

      const newPosition = await getCursorPosition();

      const externalLines = newPosition.row - originalPosition.row;

      eventHandler.externalLinesWritten += externalLines;

      return returnValue;
    },
    async requestSecretInput(
      context,
      interruptor,
      inputDescription,
      next,
    ): Promise<string> {
      const originalPosition = await getCursorPosition();

      const returnValue = next(context, interruptor, inputDescription);

      const newPosition = await getCursorPosition();

      const externalLines = newPosition.row - originalPosition.row;

      eventHandler.externalLinesWritten += externalLines;

      return returnValue;
    },
  };
}
