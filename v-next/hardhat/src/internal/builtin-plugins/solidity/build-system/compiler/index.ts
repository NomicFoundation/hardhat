import type { Compiler } from "../../../../../types/solidity.js";

import { execFile } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import { exists, isBinaryFile } from "@nomicfoundation/hardhat-utils/fs";
import { getCacheDir } from "@nomicfoundation/hardhat-utils/global-dir";
import debug from "debug";

import { hasArm64MirrorBuild, hasOfficialArm64Build } from "../solc-info.js";

import { NativeCompiler, SolcJsCompiler } from "./compiler.js";
import {
  CompilerDownloaderImplementation,
  CompilerPlatform,
} from "./downloader.js";
import wrapper from "./solcjs-wrapper.js";

async function getGlobalCompilersCacheDir(): Promise<string> {
  const globalCompilersCacheDir = await getCacheDir();

  return path.join(globalCompilersCacheDir, "compilers-v3");
}

const log = debug("hardhat:core:solidity:build-system:compiler");

/**
 * Returns true if a platform-specific build exists for the given version
 * on the given compiler platform. On non-ARM64 platforms (including WASM)
 * every version is assumed to have a build; on ARM64 Linux only versions
 * in the community mirror (>= 0.5.0) or with official builds (>= 0.8.31) do.
 *
 * Exported only for testing purposes.
 */
export function hasNativeBuildForPlatform(
  version: string,
  platform: CompilerPlatform,
): boolean {
  if (platform !== CompilerPlatform.LINUX_ARM64) {
    return true;
  }

  return hasOfficialArm64Build(version) || hasArm64MirrorBuild(version);
}

export async function downloadSolcCompilers(
  versions: Set<string>,
  quiet: boolean,
): Promise<void> {
  const platform = CompilerDownloaderImplementation.getCompilerPlatform();

  if (platform !== CompilerPlatform.WASM) {
    const mainCompilerDownloader = new CompilerDownloaderImplementation(
      platform,
      await getGlobalCompilersCacheDir(),
    );

    // Only attempt native downloads for versions that have a native build
    // on this platform. On ARM64 Linux, older versions (< 0.5.0) have no
    // native binary anywhere and would cause the downloader to throw.
    const nativeVersions = [...versions].filter((v) =>
      hasNativeBuildForPlatform(v, platform),
    );

    if (nativeVersions.length > 0) {
      await mainCompilerDownloader.updateCompilerListIfNeeded(
        new Set(nativeVersions),
      );
    }

    for (const version of nativeVersions) {
      if (!(await mainCompilerDownloader.isCompilerDownloaded(version))) {
        if (!quiet) {
          console.log(`Downloading solc ${version}`);
        }

        const success = await mainCompilerDownloader.downloadCompiler(version);

        if (!success) {
          if (!quiet) {
            console.log(`Download failed for solc ${version}`);
          }
        }
      }
    }
  }

  const wasmCompilerDownloader = new CompilerDownloaderImplementation(
    CompilerPlatform.WASM,
    await getGlobalCompilersCacheDir(),
  );

  await wasmCompilerDownloader.updateCompilerListIfNeeded(versions);

  for (const version of versions) {
    if (!(await wasmCompilerDownloader.isCompilerDownloaded(version))) {
      if (!quiet) {
        console.log(`Downloading solc ${version} (WASM build)`);
      }

      const success = await wasmCompilerDownloader.downloadCompiler(version);

      if (!success) {
        throw new HardhatError(
          HardhatError.ERRORS.CORE.SOLIDITY.DOWNLOAD_FAILED,
          {
            remoteVersion: version,
          },
        );
      }
    }
  }
}

export async function getCompiler(
  version: string,
  { preferWasm, compilerPath }: { preferWasm: boolean; compilerPath?: string },
): Promise<Compiler> {
  if (compilerPath !== undefined) {
    // If a compiler path is provided, it means the user is using a custom compiler
    return getCompilerFromPath(version, compilerPath);
  } else {
    // Otherwise we get or download the compiler for the specific version
    return getCompilerFromVersion(version, { preferWasm });
  }
}

async function getCompilerFromPath(
  compilerVersion: string,
  compilerPath: string,
): Promise<Compiler> {
  log(`Using custom compiler ${compilerPath}`);
  if (!(await exists(compilerPath))) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.SOLIDITY.COMPILER_PATH_DOES_NOT_EXIST,
      { compilerPath, version: compilerVersion },
    );
  }

  const isWasm = !(await isBinaryFile(compilerPath));

  log(`Using ${isWasm ? "WASM" : "Native"} compiler`);

  const execFileAsync = promisify(execFile);

  let stdout: string;

  if (isWasm) {
    const solc = (await import(pathToFileURL(compilerPath).toString())).default;
    const { version } = wrapper(solc);
    stdout = version();
  } else {
    stdout = (await execFileAsync(compilerPath, ["--version"])).stdout;
  }

  log(`Version output: ${stdout}`);

  const match = stdout.match(/(?<longVersion>\d+\.\d+\.\d+\+commit\.\w+)/);

  if (match === null || match.groups === undefined) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.SOLIDITY.PARSING_VERSION_STRING_FAILED,
      { versionString: stdout, compilerPath },
    );
  }

  const { longVersion } = match.groups;

  log(`Long version: ${longVersion}`);

  if (isWasm) {
    return new SolcJsCompiler(compilerVersion, longVersion, compilerPath);
  } else {
    return new NativeCompiler(compilerVersion, longVersion, compilerPath);
  }
}

async function getCompilerFromVersion(
  version: string,
  { preferWasm }: { preferWasm: boolean },
) {
  if (!preferWasm) {
    const platform = CompilerDownloaderImplementation.getCompilerPlatform();

    if (hasNativeBuildForPlatform(version, platform)) {
      const compilerDownloader = new CompilerDownloaderImplementation(
        platform,
        await getGlobalCompilersCacheDir(),
      );

      const compiler = await compilerDownloader.getCompiler(version);

      if (compiler !== undefined) {
        return compiler;
      }
    }
  }

  const wasmCompilerDownloader = new CompilerDownloaderImplementation(
    CompilerPlatform.WASM,
    await getGlobalCompilersCacheDir(),
  );

  const wasmCompiler = await wasmCompilerDownloader.getCompiler(version);

  assertHardhatInvariant(
    wasmCompiler !== undefined,
    `WASM build of solc ${version} isn't working`,
  );

  return wasmCompiler;
}
