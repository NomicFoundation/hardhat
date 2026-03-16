import type { SolidityHooks } from "hardhat/types/hooks";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { exists } from "@nomicfoundation/hardhat-utils/fs";
import debug from "debug";

import {
  DEFAULT_SOLX_SETTINGS,
  SOLIDITY_TO_SOLX_VERSION_MAP,
  SOLX_COMPILER_TYPE,
} from "../constants.js";
import { downloadSolx, getSolxBinaryPath } from "../downloader.js";
import { SolxCompiler } from "../solx-compiler.js";

const log = debug("hardhat:solx:hook-handlers:solidity");

export default async (): Promise<Partial<SolidityHooks>> => ({
  downloadCompilers: async (_context, compilerConfigs, quiet) => {
    const solxConfigs = compilerConfigs.filter(
      (c) => c.type === SOLX_COMPILER_TYPE,
    );

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

    await Promise.all(
      [...solxVersions].map(async (solxVersion) => {
        const binaryPath = await getSolxBinaryPath(solxVersion);
        if (await exists(binaryPath)) {
          log(`solx ${solxVersion} already cached at ${binaryPath}`);
          return;
        }

        if (!quiet) {
          console.log(`Downloading solx ${solxVersion}`);
        }

        const solxPath = await downloadSolx(solxVersion);
        log(`Downloaded solx ${solxVersion} to ${solxPath}`);
      }),
    );
  },

  getCompiler: async (context, compilerConfig, next) => {
    if (compilerConfig.type !== SOLX_COMPILER_TYPE) {
      return next(context, compilerConfig);
    }

    const solxVersion = SOLIDITY_TO_SOLX_VERSION_MAP[compilerConfig.version];
    assertHardhatInvariant(
      solxVersion !== undefined,
      `No solx version mapping for Solidity ${compilerConfig.version} — this should have been caught by config validation`,
    );

    const binaryPath = await getSolxBinaryPath(solxVersion);

    assertHardhatInvariant(
      await exists(binaryPath),
      `solx binary not found at ${binaryPath} — downloadCompilers should have been called first`,
    );

    log(
      `Creating SolxCompiler for Solidity ${compilerConfig.version} (solx ${solxVersion}) at ${binaryPath}`,
    );

    return new SolxCompiler(solxVersion, binaryPath, DEFAULT_SOLX_SETTINGS);
  },
});
