import type { HookContext, TestHooks } from "../../../../types/hooks.js";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";

import { HardhatRuntimeEnvironmentImplementation } from "../../../core/hre.js";

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
  hre: HookContext,
  id: string,
): Promise<void> {
  if (hre.globalOptions.gasStats === true) {
    assertHardhatInvariant(
      hre instanceof HardhatRuntimeEnvironmentImplementation,
      "Expected HRE to be an instance of HardhatRuntimeEnvironmentImplementation",
    );
    await hre._gasAnalytics.clearGasMeasurements(id);
  }
}

export async function testWorkerDone(
  hre: HookContext,
  id: string,
): Promise<void> {
  if (hre.globalOptions.gasStats === true) {
    assertHardhatInvariant(
      hre instanceof HardhatRuntimeEnvironmentImplementation,
      "Expected HRE to be an instance of HardhatRuntimeEnvironmentImplementation",
    );
    await hre._gasAnalytics.saveGasMeasurements(id);
  }
}

export async function testRunDone(hre: HookContext, id: string): Promise<void> {
  if (hre.globalOptions.gasStats === true) {
    assertHardhatInvariant(
      hre instanceof HardhatRuntimeEnvironmentImplementation,
      "Expected HRE to be an instance of HardhatRuntimeEnvironmentImplementation",
    );
    await hre._gasAnalytics.reportGasStats(id);
  }
}
