import type { SolidityHooks } from "hardhat/types/hooks";

import debug from "debug";
import { exists } from "@nomicfoundation/hardhat-utils/fs";

import {
  DEFAULT_SOLX_SETTINGS,
  SOLIDITY_TO_SOLX_VERSION_MAP,
} from "../constants.js";
import { downloadSolx, getSolxBinaryPath } from "../downloader.js";
import { SolxCompiler } from "../solx-compiler.js";

const log = debug("hardhat:solx:hook-handlers:solidity");

export default async (): Promise<Partial<SolidityHooks>> => ({
  downloadCompilers: async (_context, compilerConfigs, quiet) => {
    const solxConfigs = compilerConfigs.filter((c) => c.type === "solx");

    if (solxConfigs.length === 0) {
      return;
    }

    // Collect unique solx versions to download
    const solxVersions = new Set<string>();
    for (const config of solxConfigs) {
      const solxVersion = SOLIDITY_TO_SOLX_VERSION_MAP[config.version];
      if (solxVersion !== undefined) {
        solxVersions.add(solxVersion);
      }
    }

    for (const solxVersion of solxVersions) {
      const binaryPath = await getSolxBinaryPath(solxVersion);
      if (await exists(binaryPath)) {
        log(`solx ${solxVersion} already cached at ${binaryPath}`);
        continue;
      }

      if (!quiet) {
        console.log(`Downloading solx ${solxVersion}`);
      }

      const solxPath = await downloadSolx(solxVersion);
      log(`Downloaded solx ${solxVersion} to ${solxPath}`);
    }
  },

  getCompiler: async (context, compilerConfig, next) => {
    if (compilerConfig.type !== "solx") {
      return next(context, compilerConfig);
    }

    const solxVersion = SOLIDITY_TO_SOLX_VERSION_MAP[compilerConfig.version];
    if (solxVersion === undefined) {
      // Should not happen — validated in config validation
      return next(context, compilerConfig);
    }

    const binaryPath = await getSolxBinaryPath(solxVersion);

    log(
      `Creating SolxCompiler for Solidity ${compilerConfig.version} (solx ${solxVersion}) at ${binaryPath}`,
    );

    return new SolxCompiler(solxVersion, binaryPath, DEFAULT_SOLX_SETTINGS);
  },
});
