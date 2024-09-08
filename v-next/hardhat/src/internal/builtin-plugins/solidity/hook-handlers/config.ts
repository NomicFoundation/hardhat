import type { ConfigHooks } from "../../../../types/hooks.js";

import path from "node:path";

import {
  unionType,
  validateUserConfigZodType,
} from "@ignored/hardhat-vnext-zod-utils";
import { z } from "zod";

const sourcePathsType = unionType(
  [z.string(), z.array(z.string())],
  "Expected a string or an array of strings",
);

const userConfigType = z.object({
  sources: unionType(
    [sourcePathsType, z.object({ solidity: sourcePathsType.optional() })],
    "Expected a string, an array of strings, or an object with an optional 'solidity' property",
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

      let sourcesPaths = userConfig.paths?.sources;

      sourcesPaths =
        typeof sourcesPaths === "object" && !Array.isArray(sourcesPaths)
          ? sourcesPaths.solidity
          : sourcesPaths;

      sourcesPaths ??= "contracts";

      sourcesPaths = Array.isArray(sourcesPaths)
        ? sourcesPaths
        : [sourcesPaths];

      const resolvedPaths = sourcesPaths.map((p) =>
        path.isAbsolute(p) ? p : path.resolve(resolvedConfig.paths.root, p),
      );

      return {
        ...resolvedConfig,
        paths: {
          ...resolvedConfig.paths,
          sources: {
            ...resolvedConfig.paths.sources,
            solidity: resolvedPaths,
          },
        },
      };
    },
  };

  return handlers;
};
