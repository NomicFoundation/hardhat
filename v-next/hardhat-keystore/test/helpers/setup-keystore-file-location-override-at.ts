import type { HardhatPlugin } from "@ignored/hardhat-vnext/types/plugins";

// Use an array because the value is dynamically changed during the tests
export const FILE_PATH: string[] = [];

export const setupKeystoreFileLocationOverrideAt = (
  filePath: string,
): HardhatPlugin => {
  FILE_PATH[0] = filePath;

  const hardhatKeystoreFileLocationOverridePlugin: HardhatPlugin = {
    id: "hardhat-keystore-file-location-override",
    hookHandlers: {
      config: import.meta.resolve(
        "./setup-keystore-file-location-override-at-hook",
      ),
    },
  };

  return hardhatKeystoreFileLocationOverridePlugin;
};
