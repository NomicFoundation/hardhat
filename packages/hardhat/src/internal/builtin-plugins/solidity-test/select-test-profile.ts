import type { HardhatConfig } from "../../../types/config.js";
import type { SolidityTestProfileConfig } from "../../../types/test.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { getEnvVariableNameFromGlobalOption } from "@nomicfoundation/hardhat-utils/env";

import { DEFAULT_TEST_PROFILE } from "./test-profiles.js";

/**
 * Resolves the name of the test profile a run selected, preferring the task
 * option over the environment variable over the default.
 *
 * Only global options get an environment variable fallback for free, so we
 * apply the same naming convention by hand for this task option.
 */
export function resolveTestProfileName(testProfile?: string): string {
  return (
    testProfile ??
    process.env[getEnvVariableNameFromGlobalOption("testProfile")] ??
    DEFAULT_TEST_PROFILE
  );
}

/**
 * Returns the declared test profile with the given name, throwing if the
 * project doesn't declare it.
 */
export function getTestProfile(
  config: HardhatConfig,
  testProfileName: string,
): SolidityTestProfileConfig {
  const testProfiles = config.test.solidity.profiles;
  const selectedTestProfile = testProfiles[testProfileName];

  if (selectedTestProfile === undefined) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.SOLIDITY_TESTS.TEST_PROFILE_NOT_FOUND,
      {
        testProfile: testProfileName,
        declaredProfiles: Object.keys(testProfiles)
          .sort() // to match EDR
          .map((name) => `"${name}"`)
          .join(", "),
      },
    );
  }

  return selectedTestProfile;
}
