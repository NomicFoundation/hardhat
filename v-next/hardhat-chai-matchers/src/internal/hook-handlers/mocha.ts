import type {
  HookContext,
  MochaHooks,
} from "@ignored/hardhat-vnext/types/hooks";

import { addChaiMatchers } from "../add-chai-matchers.js";

export default async (): Promise<Partial<MochaHooks>> => {
  const handlers: Partial<MochaHooks> = {
    initialize(
      _context: HookContext,
      _next: (context: HookContext) => Promise<void>,
    ): Promise<void> {
      addChaiMatchers();

      return Promise.resolve();
    },
  };

  return handlers;
};
