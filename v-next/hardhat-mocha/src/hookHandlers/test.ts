import type { TestHooks } from "hardhat/types/hooks";

import { resolveFromRoot } from "@nomicfoundation/hardhat-utils/path";

export default async (): Promise<Partial<TestHooks>> => {
  const handlers: Partial<TestHooks> = {
    registerFileForTestRunner: async (context, filePath, next) => {
      const absoluteFilePath = resolveFromRoot(process.cwd(), filePath);

      const allRunnersDirectories = Object.values(context.config.paths.tests);

      const inThisRunnersDirectory = absoluteFilePath.includes(
        context.config.paths.tests.mocha,
      );

      const notInOtherRunnersDirectory = allRunnersDirectories.every(
        (runnersDirectory) => !absoluteFilePath.includes(runnersDirectory),
      );

      const isSolidityFile = absoluteFilePath.endsWith(".sol");

      if (
        isSolidityFile === false &&
        (inThisRunnersDirectory || notInOtherRunnersDirectory)
      ) {
        return "mocha";
      }

      return next(context, filePath);
    },
  };

  return handlers;
};
