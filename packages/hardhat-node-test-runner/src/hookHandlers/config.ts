import type { ConfigHooks } from "hardhat/types/hooks";

import { resolveFromRoot } from "@nomicfoundation/hardhat-utils/path";

export default async (): Promise<Partial<ConfigHooks>> => {
  const handlers: Partial<ConfigHooks> = {
    validateUserConfig: async (userConfig) => {
      const [{ isObject }, { conditionalUnionType, validateUserConfigZodType }, { z }] =
        await Promise.all([
          import("@nomicfoundation/hardhat-utils/lang"),
          import("@nomicfoundation/hardhat-zod-utils"),
          import("zod"),
        ]);

      const userConfigType = z.object({
        paths: z
          .object({
            test: conditionalUnionType(
              [
                [isObject, z.object({ nodejs: z.string().optional() })],
                [(data) => typeof data === "string", z.string()],
              ],
              "Expected a string or an object with an optional 'nodejs' property",
            ).optional(),
          })
          .optional(),
      });

      return validateUserConfigZodType(userConfig, userConfigType);
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

      let testsPath = userConfig.paths?.tests;

      // TODO: use isObject when the type narrowing issue is fixed
      testsPath = typeof testsPath === "object" ? testsPath.nodejs : testsPath;
      testsPath ??= "test";

      return {
        ...resolvedConfig,
        paths: {
          ...resolvedConfig.paths,
          tests: {
            ...resolvedConfig.paths.tests,
            nodejs: resolveFromRoot(resolvedConfig.paths.root, testsPath),
          },
        },
      };
    },
  };

  return handlers;
};
