import type { HookContext } from "../../../types/hooks.js";
import type { HardhatRuntimeEnvironmentImplementation } from "../../core/hre.js";

import { getOrCreateGlobalHardhatRuntimeEnvironment } from "../../hre-initialization.js";

export function unsafelyCastAsHardhatRuntimeEnvironmentImplementation(
  context: HookContext,
): HardhatRuntimeEnvironmentImplementation {
  const hre =
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- we know this is the right implementation */
    context as HardhatRuntimeEnvironmentImplementation;
  return hre;
}

// NOTE: These helpers interact with the global HRE instance only; This is OK because:
// 1. They are intended for the internal use only
// 2. We know the HRE has been initialized by the time these helpers are used

export async function clearCoverageData(): Promise<void> {
  const hre = await getOrCreateGlobalHardhatRuntimeEnvironment();
  const hreImplementation =
    unsafelyCastAsHardhatRuntimeEnvironmentImplementation(hre);

  await hreImplementation._coverage.clearData();
}

export async function saveCoverageData(): Promise<void> {
  const hre = await getOrCreateGlobalHardhatRuntimeEnvironment();
  const hreImplementation =
    unsafelyCastAsHardhatRuntimeEnvironmentImplementation(hre);

  await hreImplementation._coverage.saveData();
}

export async function loadCoverageData(): Promise<void> {
  const hre = await getOrCreateGlobalHardhatRuntimeEnvironment();
  const hreImplementation =
    unsafelyCastAsHardhatRuntimeEnvironmentImplementation(hre);

  await hreImplementation._coverage.loadData();
}
