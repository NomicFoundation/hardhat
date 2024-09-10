import type { ConfigHooks } from "@ignored/hardhat-vnext/types/hooks";

import { resolveFromRoot } from "@ignored/hardhat-vnext-utils/path";
import {
  unionType,
  validateUserConfigZodType,
} from "@ignored/hardhat-vnext-zod-utils";
import { z } from "zod";

const userConfigType = z.object({
  test: unionType(
    [z.object({ nodeTest: z.string().optional() }), z.string()],
    "Expected a string or an object with an optional 'nodeTest' property",
  ).optional(),
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
        typeof testsPath === "object" ? testsPath.nodeTest : testsPath;
      testsPath ??= "test";

      return {
        ...resolvedConfig,
        paths: {
          ...resolvedConfig.paths,
          tests: {
            ...resolvedConfig.paths.tests,
            nodeTest: resolveFromRoot(resolvedConfig.paths.root, testsPath),
          },
        },
      };
    },
  };

  return handlers;
};
