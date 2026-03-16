import type { HookContext, TestHooks } from "../../../../types/hooks.js";

import { getGasAnalyticsManager } from "../helpers.js";

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
    await getGasAnalyticsManager(context).clearGasMeasurements(id);
  }
}

export async function testWorkerDone(
  context: HookContext,
  id: string,
): Promise<void> {
  if (context.globalOptions.gasStats === true) {
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
}
