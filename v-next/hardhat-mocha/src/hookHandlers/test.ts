import type { TestHooks } from "hardhat/types/hooks";

import { resolveFromRoot } from "@nomicfoundation/hardhat-utils/path";

export default async (): Promise<Partial<TestHooks>> => {
  const handlers: Partial<TestHooks> = {
    registerFileForTestRunner: async (context, filePath, next) => {
      const absoluteFilePath = resolveFromRoot(process.cwd(), filePath);

      if (absoluteFilePath.includes(context.config.paths.tests.mocha)) {
        return "mocha";
      }

      return next(context, filePath);
    },
  };

  return handlers;
};
