import type { ConfigHooks } from "@ignored/hardhat-vnext/types/hooks";

import { validateUserConfigZodType } from "@ignored/hardhat-vnext-zod-utils";
import { z } from "zod";

const mochaConfigType = z.object({
  allowUncaught: z.boolean().optional(),
  asyncOnly: z.boolean().optional(),
  bail: z.boolean().optional(),
  checkLeaks: z.boolean().optional(),
  color: z.boolean().optional(),
  delay: z.boolean().optional(),
  diff: z.boolean().optional(),
  dryRun: z.boolean().optional(),
  failZero: z.boolean().optional(),
  fgrep: z.string().optional(),
  forbidOnly: z.boolean().optional(),
  forbidPending: z.boolean().optional(),
  fullTrace: z.boolean().optional(),
  globals: z.array(z.string()).optional(),
  grep: z.string().optional(),
  growl: z.boolean().optional(),
  inlineDiffs: z.boolean().optional(),
  invert: z.boolean().optional(),
  noHighlighting: z.boolean().optional(),
  reporter: z.string().optional(),
  reporterOptions: z.any().optional(),
  retries: z.number().optional(),
  slow: z.number().optional(),
  timeout: z.union([z.number(), z.string()]).optional(),
  ui: z
    .union([
      z.literal("bdd"),
      z.literal("tdd"),
      z.literal("qunit"),
      z.literal("exports"),
    ])
    .optional(),
  parallel: z.boolean().optional(),
  jobs: z.number().optional(),
  rootHooks: z
    .object({
      afterAll: z.union([z.function(), z.array(z.function())]).optional(),
      beforeAll: z.union([z.function(), z.array(z.function())]).optional(),
      afterEach: z.union([z.function(), z.array(z.function())]).optional(),
      beforeEach: z.union([z.function(), z.array(z.function())]).optional(),
    })
    .optional(),
  require: z.array(z.string()).optional(),
  isWorker: z.boolean().optional(),
});

const userConfigType = z.object({
  mocha: z.optional(mochaConfigType),
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

      return {
        ...resolvedConfig,
        mocha: {
          timeout: 40000,
          ...resolvedConfig.mocha,
          ...userConfig.mocha,
        },
      };
    },
  };

  return handlers;
};
