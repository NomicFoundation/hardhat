import type { HardhatUserConfig } from "../../../../src/config.js";
import type {
  ConfigHooks,
  HardhatUserConfigValidationError,
} from "../../../../src/types/hooks.js";

export default async (): Promise<Partial<ConfigHooks>> => {
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
