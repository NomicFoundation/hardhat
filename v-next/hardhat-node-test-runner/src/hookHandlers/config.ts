import type { ConfigHooks } from "@ignored/hardhat-vnext/types/hooks";

import path from "node:path";

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

      testsPath =
        typeof testsPath === "object" ? testsPath.nodeTest : testsPath;
      testsPath ??= "test";

      const mochaTestsPath = path.isAbsolute(testsPath)
        ? testsPath
        : path.resolve(resolvedConfig.paths.root, testsPath);

      return {
        ...resolvedConfig,
        paths: {
          ...resolvedConfig.paths,
          tests: {
            ...resolvedConfig.paths.tests,
            nodeTest: mochaTestsPath,
          },
        },
      };
    },
  };

  return handlers;
};
