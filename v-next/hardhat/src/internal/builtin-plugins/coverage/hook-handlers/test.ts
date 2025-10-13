import type { TestHooks } from "hardhat/types/hooks";

import { markTestRunStart } from "../helpers.js";

export default async (): Promise<Partial<TestHooks>> => {
  const handlers: Partial<TestHooks> = {
    onTestRunStart: async (_context, id) => {
      console.log(`onTestRunStart coverage hook handler called with id: ${id}`);
      await markTestRunStart(id);
    },
  };

  return handlers;
};
