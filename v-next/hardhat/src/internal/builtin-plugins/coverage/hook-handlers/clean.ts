import type { CleanHooks } from "../../../../types/hooks.js";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";

import { CoverageManagerImplementation } from "../coverage-manager.js";

export default async (): Promise<Partial<CleanHooks>> => ({
  onClean: async (context) => {
    assertHardhatInvariant(
      "_coverage" in context &&
        context._coverage instanceof CoverageManagerImplementation,
      "Expected _coverage to be defined in the HookContext, as it's should be defined in the HRE",
    );

    await context._coverage.clean();
  },
});
