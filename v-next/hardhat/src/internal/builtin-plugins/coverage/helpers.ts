import type { HookContext } from "../../../types/hooks.js";
import type { HardhatRuntimeEnvironmentImplementation } from "../../core/hre.js";

import { getOrCreateGlobalHardhatRuntimeEnvironment } from "../../hre-initialization.js";

/**
 * This function unsafely casts HardhatRuntimeEnvironment to the internal
 * HardhatRuntimeEnvironmentImplementation. We use it to access hre fields
 * that we don't want to be exposed publicly through the HardhatRuntimeEnvironment
 * interface.
 *
 * The use of this function should be limited to a minimum as it is inherently
 * unsafe.
 *
 * @param context An instance of HookContext i.e. HardhatRuntimeEnvironment
 * @returns A typed instance of HardhatRuntimeEnvironmentImplementation
 */
export function unsafelyCastAsHardhatRuntimeEnvironmentImplementation(
  context: HookContext,
): HardhatRuntimeEnvironmentImplementation {
  const hre =
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- we know this is the right implementation */
    context as HardhatRuntimeEnvironmentImplementation;
  return hre;
}

/**
 * NOTE: The following helpers interact with the global HRE instance only;
 * This is OK because:
 * - They are intended for the internal use only. They are exposed via the
 *   internal public API only.
 * - We know the HRE has been initialized by the time they are used.
 */

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

export async function saveLcovInfo(): Promise<void> {
  const hre = await getOrCreateGlobalHardhatRuntimeEnvironment();
  const hreImplementation =
    unsafelyCastAsHardhatRuntimeEnvironmentImplementation(hre);

  await hreImplementation._coverage.saveLcovInfo();
}
