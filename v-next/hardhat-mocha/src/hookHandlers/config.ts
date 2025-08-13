import type { ConfigHooks } from "hardhat/types/hooks";

import { isObject } from "@nomicfoundation/hardhat-utils/lang";
import { resolveFromRoot } from "@nomicfoundation/hardhat-utils/path";
import {
  conditionalUnionType,
  unionType,
  validateUserConfigZodType,
} from "@nomicfoundation/hardhat-zod-utils";
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
  timeout: unionType(
    [z.number(), z.string()],
    "Expected a number or a string",
  ).optional(),
  ui: unionType(
    [
      z.literal("bdd"),
      z.literal("tdd"),
      z.literal("qunit"),
      z.literal("exports"),
    ],
    'Expected "bdd", "tdd", "qunit" or "exports"',
  ).optional(),
  parallel: z.boolean().optional(),
  jobs: z.number().optional(),
  rootHooks: z
    .object({
      afterAll: unionType(
        [z.function(), z.array(z.function())],
        "Expected a function or an array of functions",
      ).optional(),
      beforeAll: unionType(
        [z.function(), z.array(z.function())],
        "Expected a function or an array of functions",
      ).optional(),
      afterEach: unionType(
        [z.function(), z.array(z.function())],
        "Expected a function or an array of functions",
      ).optional(),
      beforeEach: unionType(
        [z.function(), z.array(z.function())],
        "Expected a function or an array of functions",
      ).optional(),
    })
    .optional(),
  require: z.array(z.string()).optional(),
  isWorker: z.boolean().optional(),
});

const userConfigType = z.object({
  test: z
    .object({
      mocha: z.optional(mochaConfigType),
    })
    .optional(),
  paths: z
    .object({
      test: conditionalUnionType(
        [
          [(data) => typeof data === "string", z.string()],
          [isObject, z.object({ mocha: z.string().optional() })],
        ],
        "Expected a string or an object with an optional 'mocha' property",
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
      testsPath = typeof testsPath === "object" ? testsPath.mocha : testsPath;
      testsPath ??= "test";

      return {
        ...resolvedConfig,
        test: {
          ...resolvedConfig.test,
          mocha: {
            timeout: 40000,
            ...resolvedConfig.test.mocha,
            ...userConfig.test?.mocha,
          },
        },
        paths: {
          ...resolvedConfig.paths,
          tests: {
            ...resolvedConfig.paths.tests,
            mocha: resolveFromRoot(resolvedConfig.paths.root, testsPath),
          },
        },
      };
    },
  };

  return handlers;
};
