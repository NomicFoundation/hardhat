import type { HookContext, TestHooks } from "../../../../types/hooks.js";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";

import { CoverageManagerImplementation } from "../coverage-manager.js";

export default async (): Promise<Partial<TestHooks>> => ({
  onTestRunStart: async (context, id, next) => {
    await next(context, id);
    await testRunStart(context, id);
  },

  onTestWorkerDone: async (context, id, next) => {
    await next(context, id);
    await testWorkerDone(context, id);
  },

  onTestRunDone: async (context, id, next) => {
    await next(context, id);
    await testRunDone(context, id);
  },
});

export async function testRunStart(
  context: HookContext,
  id: string,
): Promise<void> {
  if (context.globalOptions.coverage === true) {
    assertHardhatInvariant(
      "_coverage" in context &&
        isObject(context._coverage) &&
        context._coverage instanceof CoverageManagerImplementation,
      "Expected HookContext#_coverage to be an instance of CoverageManagerImplementation",
    );
    await context._coverage.clearData(id);
  }
}

export async function testWorkerDone(
  context: HookContext,
  id: string,
): Promise<void> {
  if (context.globalOptions.coverage === true) {
    assertHardhatInvariant(
      "_coverage" in context &&
        isObject(context._coverage) &&
        context._coverage instanceof CoverageManagerImplementation,
      "Expected HookContext#_coverage to be an instance of CoverageManagerImplementation",
    );
    await context._coverage.saveData(id);
  }
}

export async function testRunDone(
  context: HookContext,
  id: string,
): Promise<void> {
  if (context.globalOptions.coverage === true) {
    assertHardhatInvariant(
      "_coverage" in context &&
        isObject(context._coverage) &&
        context._coverage instanceof CoverageManagerImplementation,
      "Expected HookContext#_coverage to be an instance of CoverageManagerImplementation",
    );
    await context._coverage.report(id);
  }
}
