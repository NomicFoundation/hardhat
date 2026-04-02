import type { CleanHooks } from "hardhat/types/hooks";

import path from "node:path";

import { remove } from "@nomicfoundation/hardhat-utils/fs";

import { DEFAULT_OUT_DIR } from "../constants.js";

export default async (): Promise<Partial<CleanHooks>> => ({
  onClean: async (context) => {
    const outDir = context.config.typechain.outDir;
    const typesPath =
      outDir ?? path.join(context.config.paths.root, DEFAULT_OUT_DIR);
    await remove(typesPath);
  },
});
