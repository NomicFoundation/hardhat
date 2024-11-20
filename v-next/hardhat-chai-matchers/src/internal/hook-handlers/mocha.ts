import type {
  HookContext,
  MochaHooks,
} from "@ignored/hardhat-vnext/types/hooks";

import { use } from "chai";
import chaiAsPromised from "chai-as-promised";

import { hardhatChaiMatchers } from "../hardhatChaiMatchers.js";

export default async (): Promise<Partial<MochaHooks>> => {
  const handlers: Partial<MochaHooks> = {
    initialize(
      _context: HookContext,
      _next: (context: HookContext) => Promise<void>,
    ): Promise<void> {
      use(hardhatChaiMatchers);
      use(chaiAsPromised);

      return Promise.resolve();
    },
  };

  return handlers;
};
