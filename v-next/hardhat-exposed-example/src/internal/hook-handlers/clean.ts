import type { CleanHooks } from "hardhat/types/hooks";

import fs from "node:fs/promises";

export default async (): Promise<Partial<CleanHooks>> => ({
  onClean: async (context) => {
    await fs.rm(context.config.paths.exposedContracts, {
      recursive: true,
      force: true,
    });
  },
});
