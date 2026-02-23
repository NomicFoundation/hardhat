import type { SolidityHooks } from "../../../../types/hooks.js";

import { isSolcConfig } from "../build-system/build-system.js";
import { downloadSolcCompilers } from "../build-system/compiler/index.js";

export default async (): Promise<Partial<SolidityHooks>> => ({
  downloadCompilers: async (_context, compilerConfigs, quiet) => {
    const solcVersions = new Set(
      compilerConfigs.filter(isSolcConfig).map((c) => c.version),
    );

    if (solcVersions.size > 0) {
      await downloadSolcCompilers(solcVersions, quiet);
    }
  },
});
