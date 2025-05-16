import type { TestHooks } from "hardhat/types/hooks";

import { resolveFromRoot } from "@nomicfoundation/hardhat-utils/path";

export default async (): Promise<Partial<TestHooks>> => {
  const handlers: Partial<TestHooks> = {
    registerFileForTestRunner: async (context, filePath, next) => {
      const absoluteFilePath = resolveFromRoot(process.cwd(), filePath);

      if (
        absoluteFilePath.startsWith(context.config.paths.tests.solidity) ||
        filePath.endsWith(".t.sol")
      ) {
        return "solidity";
      }

      return next(context, filePath);
    },
  };

  return handlers;
};
