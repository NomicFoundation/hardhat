import type { SolidityHooks } from "hardhat/types/hooks";

import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  HardhatError,
  assertHardhatInvariant,
} from "@nomicfoundation/hardhat-errors";
import { createDebug } from "@nomicfoundation/hardhat-utils/debug";
import { exists } from "@nomicfoundation/hardhat-utils/fs";

import {
  SOLIDITY_TO_SOLX_VERSION_MAP,
  SLANG_COMPILER_TYPE,
} from "../constants.js";
import { downloadSlang, getSlangBinaryPath } from "../downloader.js";
import { SlangCompiler } from "../slang-compiler.js";

const log = createDebug("hardhat:slang:hook-handlers:solidity");

const execFileAsync = promisify(execFile);

// NOTE: This function is exported for testing purposes
export function parseSlangVersion(versionOutput: string): string {
  const firstLine = versionOutput.split("\n")[0];
  const match = firstLine.match(/ v(\d+\.\d+\.\d+(?:-[\w.]+)?)/);
  assertHardhatInvariant(
    match !== null,
    `Could not parse slang version from --version output: ${versionOutput}`,
  );

  return match[1];
}

async function getSlangVersionFromBinary(binaryPath: string): Promise<string> {
  const { stdout } = await execFileAsync(binaryPath, ["--version"]);
  log(`--version output: ${stdout}`);
  return parseSlangVersion(stdout);
}

export default async (): Promise<Partial<SolidityHooks>> => ({
  downloadCompilers: async (_context, compilerConfigs, quiet) => {
    const slangConfigs = compilerConfigs.filter(
      (c) => c.type === SLANG_COMPILER_TYPE,
    );

    if (slangConfigs.length === 0) {
      return;
    }

    // Collect unique slang versions to download (skip configs with custom path)
    const slangVersions = new Set<string>();
    for (const config of slangConfigs) {
      if (config.path !== undefined) {
        log(
          `Skipping download for Solidity ${config.version}: custom path provided`,
        );
        continue;
      }
      const slangVersion = SOLIDITY_TO_SOLX_VERSION_MAP[config.version];
      if (slangVersion !== undefined) {
        slangVersions.add(slangVersion);
      }
    }

    await Promise.all(
      [...slangVersions].map(async (slangVersion) => {
        const binaryPath = await getSlangBinaryPath(slangVersion);
        if (await exists(binaryPath)) {
          log(`slang ${slangVersion} already cached at ${binaryPath}`);
          return;
        }

        const slangPath = await downloadSlang(slangVersion, () => {
          if (quiet) {
            return;
          }

          console.log(`Downloading slang ${slangVersion}`);
        });
        log(`Downloaded slang ${slangVersion} to ${slangPath}`);
      }),
    );
  },

  getCompiler: async (context, compilerConfig, next) => {
    if (compilerConfig.type !== SLANG_COMPILER_TYPE) {
      return await next(context, compilerConfig);
    }

    // Honor custom path — skip version lookup and download
    if (compilerConfig.path !== undefined) {
      if (!(await exists(compilerConfig.path))) {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_SLANG.GENERAL.BINARY_NOT_FOUND,
          { path: compilerConfig.path },
        );
      }

      const customSlangVersion = await getSlangVersionFromBinary(
        compilerConfig.path,
      );

      log(
        `Creating SlangCompiler with custom path for Solidity ${compilerConfig.version} (slang ${customSlangVersion}) at ${compilerConfig.path}`,
      );

      return new SlangCompiler(customSlangVersion, compilerConfig.path);
    }

    const slangVersion = SOLIDITY_TO_SOLX_VERSION_MAP[compilerConfig.version];
    assertHardhatInvariant(
      slangVersion !== undefined,
      `No slang version mapping for Solidity ${compilerConfig.version} — this should have been caught by config validation`,
    );

    const binaryPath = await getSlangBinaryPath(slangVersion);

    assertHardhatInvariant(
      await exists(binaryPath),
      `slang binary not found at ${binaryPath} — downloadCompilers should have been called first`,
    );

    log(
      `Creating SlangCompiler for Solidity ${compilerConfig.version} (slang ${slangVersion}) at ${binaryPath}`,
    );

    return new SlangCompiler(slangVersion, binaryPath);
  },
});
