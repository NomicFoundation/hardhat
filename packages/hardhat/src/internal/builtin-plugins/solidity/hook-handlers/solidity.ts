import type { SolidityHooks } from "../../../../types/hooks.js";

import { downloadSolcCompilersHandler } from "../solidity-hooks.js";

export default async (): Promise<Partial<SolidityHooks>> => ({
  downloadCompilers: async (_context, compilerConfigs, quiet) => {
    await downloadSolcCompilersHandler(compilerConfigs, quiet);
  },
});
