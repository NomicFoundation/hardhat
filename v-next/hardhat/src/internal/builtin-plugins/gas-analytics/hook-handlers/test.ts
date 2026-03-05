import type { HookContext, TestHooks } from "../../../../types/hooks.js";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";

import { GasAnalyticsManagerImplementation } from "../gas-analytics-manager.js";

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
  if (context.globalOptions.gasStats === true) {
    assertHardhatInvariant(
      "_gasAnalytics" in context &&
        isObject(context._gasAnalytics) &&
        context._gasAnalytics instanceof GasAnalyticsManagerImplementation,
      "Expected HookContext#_gasAnalytics to be an instance of GasAnalyticsManagerImplementation",
    );
    await context._gasAnalytics.clearGasMeasurements(id);
  }
}

export async function testWorkerDone(
  context: HookContext,
  id: string,
): Promise<void> {
  if (context.globalOptions.gasStats === true) {
    assertHardhatInvariant(
      "_gasAnalytics" in context &&
        isObject(context._gasAnalytics) &&
        context._gasAnalytics instanceof GasAnalyticsManagerImplementation,
      "Expected HookContext#_gasAnalytics to be an instance of GasAnalyticsManagerImplementation",
    );
    await context._gasAnalytics.saveGasMeasurements(id);
  }
}

export async function testRunDone(
  context: HookContext,
  id: string,
): Promise<void> {
  if (context.globalOptions.gasStats === true) {
    assertHardhatInvariant(
      "_gasAnalytics" in context &&
        isObject(context._gasAnalytics) &&
        context._gasAnalytics instanceof GasAnalyticsManagerImplementation,
      "Expected HookContext#_gasAnalytics to be an instance of GasAnalyticsManagerImplementation",
    );
    await context._gasAnalytics.reportGasStats(id);
  }
}
