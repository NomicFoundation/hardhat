import type { ConfigHooks } from "@ignored/hardhat-vnext/types/hooks";

import { isObject } from "@ignored/hardhat-vnext-utils/lang";
import { resolveFromRoot } from "@ignored/hardhat-vnext-utils/path";
import {
  conditionalUnionType,
  validateUserConfigZodType,
} from "@ignored/hardhat-vnext-zod-utils";
import { z } from "zod";

const userConfigType = z.object({
  paths: z
    .object({
      test: conditionalUnionType(
        [
          [isObject, z.object({ solidity: z.string().optional() })],
          [(data) => typeof data === "string", z.string()],
        ],
        "Expected a string or an object with an optional 'solidity' property",
      ).optional(),
    })
    .optional(),
});

export default async (): Promise<Partial<ConfigHooks>> => {
  const handlers: Partial<ConfigHooks> = {
    validateUserConfig: async (userConfig) => {
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
      testsPath =
        typeof testsPath === "object" ? testsPath.solidity : testsPath;
      testsPath ??= "test";

      return {
        ...resolvedConfig,
        paths: {
          ...resolvedConfig.paths,
          tests: {
            ...resolvedConfig.paths.tests,
            solidity: resolveFromRoot(resolvedConfig.paths.root, testsPath),
          },
        },
      };
    },
  };

  return handlers;
};
