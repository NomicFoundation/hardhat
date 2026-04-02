import type { HookManager } from "../../../../types/hooks.js";

import { readUtf8File } from "@nomicfoundation/hardhat-utils/fs";

export function readSourceFileFactory(
  hooks: HookManager,
): (absPath: string) => Promise<string> {
  return async (factoryAbsPath: string) => {
    return hooks.runHandlerChain(
      "solidity",
      "readSourceFile",
      [factoryAbsPath],
      async (_context, absPath) => readUtf8File(absPath),
    );
  };
}
