import type { HookContext, TestHooks } from "../../../../types/hooks.js";

import { getGasAnalyticsManager } from "../helpers/accessors.js";

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

function isGasStatsEnabled(context: HookContext): boolean {
  return (
    context.globalOptions.gasStats === true ||
    context.globalOptions.gasStatsJson !== undefined
  );
}

export async function testRunStart(
  context: HookContext,
  id: string,
): Promise<void> {
  if (isGasStatsEnabled(context)) {
    await getGasAnalyticsManager(context).clearGasMeasurements(id);
  }
}

export async function testWorkerDone(
  context: HookContext,
  id: string,
): Promise<void> {
  if (isGasStatsEnabled(context)) {
    await getGasAnalyticsManager(context).saveGasMeasurements(id);
  }
}

export async function testRunDone(
  context: HookContext,
  id: string,
): Promise<void> {
  if (context.globalOptions.gasStats === true) {
    await getGasAnalyticsManager(context).reportGasStats(id);
  }
  if (context.globalOptions.gasStatsJson !== undefined) {
    await getGasAnalyticsManager(context).writeGasStatsJson(
      context.globalOptions.gasStatsJson,
      id,
    );
  }
}
