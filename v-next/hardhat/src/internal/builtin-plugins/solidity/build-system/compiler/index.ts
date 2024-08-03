import type { Compiler } from "./compiler.js";

import path from "node:path";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@ignored/hardhat-vnext-errors";
import { getCacheDir } from "@ignored/hardhat-vnext-utils/global-dir";

import {
  CompilerDownloaderImplementation,
  CompilerPlatform,
} from "./downloader.js";

async function getGlobalCompilersCacheDir(): Promise<string> {
  const globalCompilersCacheDir = await getCacheDir();

  return path.join(globalCompilersCacheDir, "compilers-v3");
}

export async function downloadConfiguredCompilers(
  versions: Set<string>,
  quiet: boolean,
): Promise<void> {
  const platform = CompilerDownloaderImplementation.getCompilerPlatform();

  const mainCompilerDownloader = new CompilerDownloaderImplementation(
    platform,
    await getGlobalCompilersCacheDir(),
  );

  await mainCompilerDownloader.updateCompilerListIfNeeded(versions);

  const wasmCompilersToGet = new Set<string>();

  for (const version of versions) {
    if (!(await mainCompilerDownloader.isCompilerDownloaded(version))) {
      if (!quiet) {
        console.log(`Downloading solc ${version}`);
      }

      const success = await mainCompilerDownloader.downloadCompiler(version);

      if (!success) {
        wasmCompilersToGet.add(version);

        if (!quiet) {
          console.log(`Download failed for solc ${version}`);
        }
      }
    }
  }

  if (platform === CompilerPlatform.WASM || wasmCompilersToGet.size === 0) {
    return;
  }

  const wasmCompilerDownloader = new CompilerDownloaderImplementation(
    CompilerPlatform.WASM,
    await getGlobalCompilersCacheDir(),
  );

  await wasmCompilerDownloader.updateCompilerListIfNeeded(wasmCompilersToGet);

  for (const version of wasmCompilersToGet) {
    if (!quiet) {
      console.log(`Downloading solc ${version} (WASM build)`);
    }

    const success = await wasmCompilerDownloader.downloadCompiler(version);

    if (!success) {
      throw new HardhatError(HardhatError.ERRORS.SOLIDITY.DOWNLOAD_FAILED, {
        remoteVersion: version,
      });
    }
  }
}

export async function getCompiler(version: string): Promise<Compiler> {
  const platform = CompilerDownloaderImplementation.getCompilerPlatform();
  const compilerDownloader = new CompilerDownloaderImplementation(
    platform,
    await getGlobalCompilersCacheDir(),
  );

  const compiler = await compilerDownloader.getCompiler(version);

  if (compiler !== undefined) {
    return compiler;
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
