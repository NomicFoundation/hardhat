import type { HardhatPlugin } from "../types/plugins.js";
import { z } from "zod";
import {
  SensitiveStringType,
  validateUserConfigZodType,
} from "./config/validation-utils.js";

const SolidityUserConfig = z.object({
  version: z.string(),
});

const HardhatUserConfig = z.object({
  solidity: z.optional(z.union([z.string(), SolidityUserConfig])),
  privateKey: z.optional(SensitiveStringType),
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

        const version =
          typeof userConfig.solidity === "string"
            ? userConfig.solidity
            : userConfig.solidity?.version ?? "0.8.2";

        resolvedConfig.solidity = {
          ...resolvedConfig.solidity,
          version,
        };

        if (userConfig.privateKey !== undefined) {
          resolvedConfig.privateKey = resolveConfigurationVariable(
            userConfig.privateKey,
          );
        }

        return resolvedConfig;
      },
    }),
    configurationVariables: async () => {
      let configVariablesStore: Record<string, string> | undefined;

      return {
        fetchValue: async (context, variable, _next) => {
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
  dependencies: [],
} satisfies HardhatPlugin;
