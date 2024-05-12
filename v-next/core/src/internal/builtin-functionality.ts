import type { HardhatPlugin } from "../types/plugins.js";
import { z } from "zod";
import { validateUserConfigZodType } from "./config/validation-utils.js";

const HardhatUserConfig = z.object({
  // TODO: validate the tasks array
});

export default {
  id: "builtin-functionality",
  hookHandlers: {
    config: async () => ({
      validateUserConfig: async (config) => {
        return validateUserConfigZodType(config, HardhatUserConfig);
      },
      resolveUserConfig: async (
        userConfig,
        resolveConfigurationVariable,
        next,
      ) => {
        const resolvedConfig = await next(
          userConfig,
          resolveConfigurationVariable,
        );

        return { ...resolvedConfig, tasks: userConfig.tasks ?? [] };
      },
    }),
    configurationVariables: async () => {
      let configVariablesStore: Record<string, string> | undefined;

      return {
        fetchValue: async (context, variable, _next) => {
          // TODO: Actually fetch the configuration variable, this is just a
          //  stub
          if (configVariablesStore === undefined) {
            const password = await context.interruptions.requestSecretInput(
              "Configuration variables",
              "Encryption password",
            );

            void password;
            configVariablesStore = {
              [variable.name]: `decrypted value of ${variable.name} with password "${password}"`,
            };
          }

          return configVariablesStore[variable.name];
        },
      };
    },
  },
} satisfies HardhatPlugin;
