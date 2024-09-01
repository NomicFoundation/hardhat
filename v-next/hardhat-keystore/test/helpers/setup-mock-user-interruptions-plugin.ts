import type { MockUserInterruptionManager } from "./mock-user-interruption-manager.js";
import type { HardhatPlugin } from "@ignored/hardhat-vnext/types/plugins";

// TODO: we should upgrade this to user interruption overrider
/**
 * This is intended to be included in tests as part of a `createHardhatRuntimeEnvironment` call.
 * It will substitue in a mock user interruption manager, allowing tests to simulate the user.
 */
export const setupMockUserInterruptionPlugin = (
  mockUserInterruptionManager: MockUserInterruptionManager,
): HardhatPlugin => {
  const hardhatKeystoreFileLocationOverridePlugin: HardhatPlugin = {
    id: "hardhat-mock-user-interruptions",
    hookHandlers: {
      hre: async () => {
        return {
          created: async (_context, hre) => {
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- something, something testing
            (hre as any).interruptions = mockUserInterruptionManager;
          },
        };
      },
    },
  };

  return hardhatKeystoreFileLocationOverridePlugin;
};
