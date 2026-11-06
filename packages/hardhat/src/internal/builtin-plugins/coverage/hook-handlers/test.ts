import type { HookContext, TestHooks } from "../../../../types/hooks.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { getCoverageManager } from "../helpers/accessors.js";

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
    const coverageManager = getCoverageManager(context);

    // The coverage metadata is collected while compiling, and only kept in
    // memory, so a test run that didn't build would report no coverage.
    if (!coverageManager.hasBuildRun()) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.COVERAGE.COMPILATION_REQUIRED,
      );
    }

    await coverageManager.clearData(id);
  }
}

export async function testWorkerDone(
  context: HookContext,
  id: string,
): Promise<void> {
  if (context.globalOptions.coverage === true) {
    await getCoverageManager(context).saveData(id);
  }
}

export async function testRunDone(
  context: HookContext,
  id: string,
): Promise<void> {
  if (context.globalOptions.coverage === true) {
    await getCoverageManager(context).report(id);
  }
}
