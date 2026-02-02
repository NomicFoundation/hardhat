import { latestSupportedSolidityVersion } from "@nomicfoundation/edr";
import semver from "semver";

import {
  Compiler as SolcJsCompiler,
  NativeCompiler,
} from "../../src/internal/solidity/compiler";
import {
  Compiler,
  CompilerDownloader,
  CompilerPlatform,
} from "../../src/internal/solidity/compiler/downloader";
import { getCompilersDir } from "../../src/internal/util/global-dir";

import { CompilerInput, CompilerOutput } from "../../src/types";

interface SolcSourceFileToContents {
  [filename: string]: { content: string };
}

export async function compileLiteral(
  source: string,
  solcVersion: string = "0.8.0",
  filename: string = "literal.sol"
): Promise<[CompilerInput, CompilerOutput]> {
  await downloadCompiler(solcVersion);
  const compiler = await getCompilerForVersion(solcVersion);

  return compile(getSolcInputForLiteral(source, filename), compiler);
}

function getSolcInput(sources: SolcSourceFileToContents): CompilerInput {
  const optimizer = {
    enabled: false,
  };

  const settings: CompilerInput["settings"] = {
    optimizer,
    outputSelection: {
      "*": {
        "*": [
          "abi",
          "evm.bytecode",
          "evm.deployedBytecode",
          "evm.methodIdentifiers",
        ],
        "": ["id", "ast"],
      },
    },
  };

  return {
    language: "Solidity",
    sources,
    settings,
  };
}

function getSolcInputForLiteral(
  source: string,
  filename: string = "literal.sol"
): CompilerInput {
  return getSolcInput({ [filename]: { content: source } });
}

async function compile(
  input: CompilerInput,
  compiler: Compiler
): Promise<[CompilerInput, CompilerOutput]> {
  let runnableCompiler: any;
  if (compiler.isSolcJs) {
    runnableCompiler = new SolcJsCompiler(compiler.compilerPath);
  } else {
    runnableCompiler = new NativeCompiler(compiler.compilerPath);
  }

  const output = await runnableCompiler.compile(input);

  if (output.errors !== undefined) {
    for (const error of output.errors) {
      if (error.severity === "error") {
        throw new Error(`Failed to compile: ${error.message}`);
      }
    }
  }

  return [input, output];
}

async function getCompilerForVersion(
  solidityVersion: string
): Promise<Compiler> {
  const compilersCache = await getCompilersDir();
  const downloader = CompilerDownloader.getConcurrencySafeDownloader(
    CompilerDownloader.getCompilerPlatform(),
    compilersCache
  );

  const compiler = await downloader.getCompiler(solidityVersion);
  if (compiler !== undefined) {
    return compiler;
  }

  const wasmDownloader = CompilerDownloader.getConcurrencySafeDownloader(
    CompilerPlatform.WASM,
    compilersCache
  );

  const wasmCompiler = await wasmDownloader.getCompiler(solidityVersion);

  if (wasmCompiler === undefined) {
    throw new Error("Expected compiler to be downloaded");
  }

  return wasmCompiler;
}

async function downloadCompiler(solidityVersion: string): Promise<void> {
  const compilersCache = await getCompilersDir();
  const downloader = CompilerDownloader.getConcurrencySafeDownloader(
    CompilerDownloader.getCompilerPlatform(),
    compilersCache
  );

  const isCompilerDownloaded = await downloader.isCompilerDownloaded(
    solidityVersion
  );

  if (!isCompilerDownloaded) {
    console.log("Downloading solc", solidityVersion);
    await downloader.downloadCompiler(
      solidityVersion,
      async () => {},
      async () => {}
    );
  }

  const compiler = await downloader.getCompiler(solidityVersion);

  if (compiler !== undefined) {
    return;
  }

  const wasmDownloader = CompilerDownloader.getConcurrencySafeDownloader(
    CompilerPlatform.WASM,
    compilersCache
  );

  const isWasmCompilerDownloaded = await downloader.isCompilerDownloaded(
    solidityVersion
  );

  if (!isWasmCompilerDownloaded) {
    console.log("Downloading solcjs", solidityVersion);
    await wasmDownloader.downloadCompiler(
      solidityVersion,
      async () => {},
      async () => {}
    );
  }
}

export const getNextUnsupportedVersion = () =>
  semver.inc(latestSupportedSolidityVersion(), "patch")!;

export const getNextNextUnsupportedVersion = () =>
  semver.inc(getNextUnsupportedVersion(), "patch")!;
