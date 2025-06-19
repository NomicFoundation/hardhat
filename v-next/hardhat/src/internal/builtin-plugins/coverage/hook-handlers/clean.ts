import type { CleanHooks } from "../../../../types/hooks.js";

import { remove } from "@nomicfoundation/hardhat-utils/fs";

import { getCoveragePath } from "../helpers.js";

export default async (): Promise<Partial<CleanHooks>> => ({
  onClean: async (context) => {
    const coveragePath = getCoveragePath(context.config.paths.root);
    await remove(coveragePath);
  },
});
