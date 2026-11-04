import type { SlangRelease } from "../constants.js";
import type { HardhatConfig } from "hardhat/types/config";
import type { SolidityHooks } from "hardhat/types/hooks";

import { execFile } from "node:child_process";
import { promisify, styleText } from "node:util";

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

// One command can run several builds (e.g. `test solidity`), so the warning
// is printed at most once per process.
let hasWarnedAboutSlang = false;

// NOTE: This function is exported for testing purposes
export function resetSlangWarning(): void {
  hasWarnedAboutSlang = false;
}

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
 * Returns the slang release the config resolved to, pinned or the latest.
 * Config validation already rejects an unknown release, so that check is an
 * invariant here.
 */
function getSlangRelease(config: HardhatConfig): {
  version: string;
  release: SlangRelease;
} {
  const version = config.slang.version;
  const release = SLANG_RELEASES[version];
  assertHardhatInvariant(
    release !== undefined,
    `Unknown slang version ${version} — this should have been caught by config validation`,
  );

  return { version, release };
}

/**
 * Whether the build profile compiles anything with slang, through either its
 * compilers or its overrides. An unknown profile is left for the build system
 * to reject.
 */
function buildProfileUsesSlang(
  config: HardhatConfig,
  buildProfile: string,
): boolean {
  const profile = config.solidity.profiles[buildProfile];
  if (profile === undefined) {
    return false;
  }

  return [...profile.compilers, ...Object.values(profile.overrides)].some(
    (c) => c.type === SLANG_COMPILER_TYPE,
  );
}

export default async (): Promise<Partial<SolidityHooks>> => ({
  downloadCompilers: async (context, compilerConfigs, quiet) => {
    // Every type: "slang" entry without a custom path shares the single
    // slang release, whatever its Solidity version, so there is at most one
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

    const { version: slangVersion, release } = getSlangRelease(context.config);

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

    const { version: slangVersion, release } = getSlangRelease(context.config);

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

  build: async (context, rootFilePaths, options, next) => {
    // The build system falls back to the "default" profile when none is given
    const buildProfile = options?.buildProfile ?? "default";

    // Printed even when quiet, like compiler warnings
    if (
      !hasWarnedAboutSlang &&
      buildProfileUsesSlang(context.config, buildProfile)
    ) {
      hasWarnedAboutSlang = true;

      console.warn(
        `${styleText(["yellow", "bold"], "Warning:")} This build compiles with slang, an experimental compiler. Key functionality, such as validation of incorrect code, is still under active development. Keep using solc for production builds and anything you deploy.\n`,
      );
    }

    return await next(context, rootFilePaths, options);
  },
});
