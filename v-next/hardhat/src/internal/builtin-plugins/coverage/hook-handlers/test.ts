import type { HookContext, TestHooks } from "../../../../types/hooks.js";

import { getCoverageManager } from "../helpers.js";

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
    await getCoverageManager(context).clearData(id);
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
