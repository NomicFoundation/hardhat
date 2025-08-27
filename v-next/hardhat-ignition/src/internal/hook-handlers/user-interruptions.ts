import type { PrettyEventHandler } from "../../helpers.js";
import type { UserInterruptionHooks } from "hardhat/types/hooks";

export function getUserInterruptionsHandlers(
  eventHandler: PrettyEventHandler,
): UserInterruptionHooks {
  return {
    async displayMessage(
      _context,
      interruptor,
      message,
      __next,
    ): Promise<void> {
      const formattedMessage = `[${interruptor}] ${message}`;

      // console.log(formattedMessage);

      eventHandler.externalLinesWritten += formattedMessage.split("\n").length;
    },
    async requestInput(
      _context,
      interruptor,
      inputDescription,
      __next,
    ): Promise<string> {
      const formattedMessage = `[${interruptor}] ${inputDescription}`;

      // This one shouldn't just print, but also request the user input
      // console.log(formattedMessage);

      // Maybe the math should be different here?
      eventHandler.externalLinesWritten += formattedMessage.split("\n").length;

      return "mock response";
    },
    async requestSecretInput(
      _context,
      interruptor,
      inputDescription,
      _next,
    ): Promise<string> {
      const formattedMessage = `[${interruptor}] ${inputDescription}`;

      // console.log("Hello from the task's implementation of requestSecretInput");

      eventHandler.externalLinesWritten += formattedMessage.split("\n").length;

      return "same as above but the input should be displayed as ***";
    },
  };
}
