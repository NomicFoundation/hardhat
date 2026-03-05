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

    await mainCompilerDownloader.updateCompilerListIfNeeded(versions);

    for (const version of versions) {
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
    const compilerDownloader = new CompilerDownloaderImplementation(
      platform,
      await getGlobalCompilersCacheDir(),
    );

    const compiler = await compilerDownloader.getCompiler(version);

    if (compiler !== undefined) {
      return compiler;
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
