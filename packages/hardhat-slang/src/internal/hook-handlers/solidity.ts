import type { SlangRelease } from "../constants.js";
import type { HardhatConfig } from "hardhat/types/config";
import type { SolidityHooks } from "hardhat/types/hooks";

import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  HardhatError,
  assertHardhatInvariant,
} from "@nomicfoundation/hardhat-errors";
import { createDebug } from "@nomicfoundation/hardhat-utils/debug";
import { exists } from "@nomicfoundation/hardhat-utils/fs";

import { SLANG_COMPILER_TYPE, SLANG_RELEASES } from "../constants.js";
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

/**
 * Returns the slang release pinned in the config. Config validation already
 * guarantees it is set and known whenever a `type: "slang"` entry needs a
 * download, so both checks are invariants here.
 */
function getPinnedRelease(config: HardhatConfig): {
  version: string;
  release: SlangRelease;
} {
  const version = config.slang.version;
  assertHardhatInvariant(
    version !== undefined,
    `slang.version is not set — this should have been caught by config validation`,
  );

  const release = SLANG_RELEASES[version];
  assertHardhatInvariant(
    release !== undefined,
    `Unknown slang version ${version} — this should have been caught by config validation`,
  );

  return { version, release };
}

export default async (): Promise<Partial<SolidityHooks>> => ({
  downloadCompilers: async (context, compilerConfigs, quiet) => {
    // Every type: "slang" entry without a custom path shares the single
    // pinned release, whatever its Solidity version, so there is at most one
    // binary to download.
    const needsDownload = compilerConfigs.some((c) => {
      if (c.type !== SLANG_COMPILER_TYPE) {
        return false;
      }
      if (c.path !== undefined) {
        log(
          `Skipping download for Solidity ${c.version}: custom path provided`,
        );
        return false;
      }
      return true;
    });

    if (!needsDownload) {
      return;
    }

    const { version: slangVersion, release } = getPinnedRelease(context.config);

    const binaryPath = await getSlangBinaryPath(slangVersion, release);
    if (await exists(binaryPath)) {
      log(`slang ${slangVersion} already cached at ${binaryPath}`);
      return;
    }

    const slangPath = await downloadSlang(slangVersion, release, () => {
      if (quiet) {
        return;
      }

      console.log(`Downloading slang ${slangVersion}`);
    });
    log(`Downloaded slang ${slangVersion} to ${slangPath}`);
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

    const { version: slangVersion, release } = getPinnedRelease(context.config);

    const binaryPath = await getSlangBinaryPath(slangVersion, release);

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
