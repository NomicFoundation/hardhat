import type { HardhatUserConfig } from "../../../src/types/config.js";
import type {
  ConfigHooks,
  HardhatUserConfigValidationError,
} from "@nomicfoundation/hardhat-core/types/hooks";

export default async () => {
  const handlers: Partial<ConfigHooks> = {
    validateUserConfig: async (
      _config: HardhatUserConfig,
    ): Promise<HardhatUserConfigValidationError[]> => {
      return [
        {
          message: "FromLoadedPlugin",
          path: [],
        },
      ];
    },
  };

  return handlers;
};
