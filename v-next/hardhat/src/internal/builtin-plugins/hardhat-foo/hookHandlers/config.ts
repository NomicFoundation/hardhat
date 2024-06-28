import type { ConfigHooks } from "@ignored/hardhat-vnext-core/types/hooks";

import {
  sensitiveStringType,
  validateUserConfigZodType,
} from "@ignored/hardhat-vnext-zod-utils";
import { z } from "zod";

const fooUserConfigType = z.object({
  bar: z.optional(z.union([z.number(), z.array(z.number())])),
});

const hardhatUserConfig = z.object({
  foo: z.optional(fooUserConfigType),
  privateKey: z.optional(sensitiveStringType),
});

export default async (): Promise<Partial<ConfigHooks>> => {
  const handlers: Partial<ConfigHooks> = {
    validateUserConfig: async (userConfig) => {
      return validateUserConfigZodType(userConfig, hardhatUserConfig);
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

      const bar = userConfig.foo?.bar ?? [42];

      return {
        ...resolvedConfig,
        foo: {
          ...resolvedConfig.foo,
          bar: typeof bar === "number" ? [bar] : bar,
        },
        privateKey:
          userConfig.privateKey !== undefined
            ? resolveConfigurationVariable(userConfig.privateKey)
            : undefined,
      };
    },
  };

  return handlers;
};
