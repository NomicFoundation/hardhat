import type { SolidityHooks } from "hardhat/types/hooks";

import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  HardhatError,
  assertHardhatInvariant,
} from "@nomicfoundation/hardhat-errors";
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

const execFileAsync = promisify(execFile);

// NOTE: This function is exported for testing purposes
export function parseSolxVersion(versionOutput: string): string {
  const firstLine = versionOutput.split("\n")[0];
  const match = firstLine.match(/ v(\d+\.\d+\.\d+(?:-[\w.]+)?)/);
  assertHardhatInvariant(
    match !== null,
    `Could not parse solx version from --version output: ${versionOutput}`,
  );

  return match[1];
}

async function getSolxVersionFromBinary(binaryPath: string): Promise<string> {
  const { stdout } = await execFileAsync(binaryPath, ["--version"]);
  log(`--version output: ${stdout}`);
  return parseSolxVersion(stdout);
}

export default async (): Promise<Partial<SolidityHooks>> => ({
  downloadCompilers: async (_context, compilerConfigs, quiet) => {
    const solxConfigs = compilerConfigs.filter(
      (c) => c.type === SOLX_COMPILER_TYPE,
    );

    if (solxConfigs.length === 0) {
      return;
    }

    // Collect unique solx versions to download (skip configs with custom path)
    const solxVersions = new Set<string>();
    for (const config of solxConfigs) {
      if (config.path !== undefined) {
        log(
          `Skipping download for Solidity ${config.version}: custom path provided`,
        );
        continue;
      }
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

    // Honor custom path — skip version lookup and download
    if (compilerConfig.path !== undefined) {
      if (!(await exists(compilerConfig.path))) {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_SOLX.GENERAL.BINARY_NOT_FOUND,
          { path: compilerConfig.path },
        );
      }

      const customSolxVersion = await getSolxVersionFromBinary(
        compilerConfig.path,
      );

      log(
        `Creating SolxCompiler with custom path for Solidity ${compilerConfig.version} (solx ${customSolxVersion}) at ${compilerConfig.path}`,
      );

      return new SolxCompiler(
        customSolxVersion,
        compilerConfig.path,
        DEFAULT_SOLX_SETTINGS,
      );
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
