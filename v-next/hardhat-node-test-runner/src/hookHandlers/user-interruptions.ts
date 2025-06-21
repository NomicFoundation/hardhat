import type { HookContext, UserInterruptionHooks } from "hardhat/types/hooks";

import { isChildTestProcess, TestProtocolClient } from "../protocol.js";

export default async (): Promise<Partial<UserInterruptionHooks>> => {
  const handlers: Partial<UserInterruptionHooks> = {
    requestSecretInput: async (
      context: HookContext,
      interruptor: string,
      inputDescription: string,
      next: (
        nextContext: HookContext,
        nextInterruptor: string,
        nextInputDescription: string,
      ) => Promise<string>,
    ) => {
      // Test child processes cannot deal with user input, so we request the main runner process via sockets
      if (isChildTestProcess()) {
        const client = new TestProtocolClient();
        return client.requestSecretInput(interruptor, inputDescription);
      } else {
        return next(context, interruptor, inputDescription);
      }
    },
  };

  return handlers;
};
