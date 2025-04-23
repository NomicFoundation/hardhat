import type { HardhatPlugin } from "hardhat/types/plugins";

export const setupKeystoreFileLocationOverrideAt = (
  keystoreFilePath: string,
): HardhatPlugin => {
  const hardhatKeystoreFileLocationOverridePlugin: HardhatPlugin = {
    id: "hardhat-keystore-file-location-override",
    hookHandlers: {
      config: async () => {
        return {
          resolveUserConfig: async (
            userConfig,
            resolveConfigurationVariable,
            next,
          ) => {
            const resolvedConfig = await next(
              userConfig,
              resolveConfigurationVariable,
            );

            return {
              ...resolvedConfig,
              keystore: {
                filePath: keystoreFilePath,
              },
            };
          },
        };
      },
    },
  };

  return hardhatKeystoreFileLocationOverridePlugin;
};
