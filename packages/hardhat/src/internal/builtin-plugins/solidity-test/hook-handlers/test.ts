import type { TestHooks } from "hardhat/types/hooks";

import { resolveFromRoot } from "@nomicfoundation/hardhat-utils/path";

export default async (): Promise<Partial<TestHooks>> => {
  const handlers: Partial<TestHooks> = {
    registerFileForTestRunner: async (context, filePath, next) => {
      const absoluteFilePath = resolveFromRoot(process.cwd(), filePath);

      if (
        filePath.endsWith(".sol") &&
        (filePath.endsWith(".t.sol") ||
          absoluteFilePath.startsWith(context.config.paths.tests.solidity))
      ) {
        return "solidity";
      }

      return next(context, filePath);
    },
  };

  return handlers;
};
