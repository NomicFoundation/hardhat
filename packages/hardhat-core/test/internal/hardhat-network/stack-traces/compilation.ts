import fs from "fs";
import path from "path";

import {
  Compiler as SolcJsCompiler,
  NativeCompiler,
} from "../../../../src/internal/solidity/compiler";
import {
  Compiler,
  CompilerDownloader,
  CompilerPlatform,
} from "../../../../src/internal/solidity/compiler/downloader";
import { getCompilersDir } from "../../../../src/internal/util/global-dir";

import { CompilerInput, CompilerOutput } from "../../../../src/types";

import { SolidityCompiler } from "./compilers-list";

interface SolcSourceFileToContents {
  [filename: string]: { content: string };
}

function getSolcSourceFileMapping(sources: string[]): SolcSourceFileToContents {
  return Object.assign(
    {},
    ...sources.map((s) => ({
      [path.basename(s)]: { content: fs.readFileSync(s, "utf8") },
    }))
  );
}

function getSolcInput(
  sources: SolcSourceFileToContents,
  compilerOptions: SolidityCompiler
): CompilerInput {
  const isViaIR = compilerOptions.optimizer?.viaIR ?? false;

  const optimizerDetails = isViaIR
    ? {
        yulDetails: {
          optimizerSteps: "u",
        },
      }
    : undefined;

  const optimizer =
    compilerOptions.optimizer === undefined
      ? {
          enabled: false,
        }
      : {
          enabled: true,
          runs: compilerOptions.optimizer.runs,
          details: optimizerDetails,
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

  // old compilers might throw if we use the `viaIR` setting because they don't
  // recognize the option, so we only set it when it's true
  if (isViaIR) {
    settings.viaIR = true;
  }

  return {
    language: "Solidity",
    sources,
    settings,
  };
}

function getSolcInputForFiles(
  sources: string[],
  compilerOptions: SolidityCompiler
): CompilerInput {
  return getSolcInput(getSolcSourceFileMapping(sources), compilerOptions);
}

function getSolcInputForLiteral(
  source: string,
  compilerOptions: SolidityCompiler,
  filename: string = "literal.sol"
): CompilerInput {
  return getSolcInput({ [filename]: { content: source } }, compilerOptions);
}

export const COMPILER_DOWNLOAD_TIMEOUT = 10000;

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

export async function compileFiles(
  sources: string[],
  compilerOptions: SolidityCompiler
): Promise<[CompilerInput, CompilerOutput]> {
  let compiler: Compiler;
  // special case for running tests with custom solc
  if (path.isAbsolute(compilerOptions.compilerPath)) {
    compiler = {
      compilerPath: compilerOptions.compilerPath,
      isSolcJs: process.env.HARDHAT_TESTS_SOLC_NATIVE !== "true",
      version: compilerOptions.solidityVersion,
      longVersion: compilerOptions.solidityVersion,
    };
  } else {
    compiler = await getCompilerForVersion(compilerOptions.solidityVersion);
  }

  return compile(getSolcInputForFiles(sources, compilerOptions), compiler);
}

export async function compileLiteral(
  source: string,
  compilerOptions: SolidityCompiler = {
    solidityVersion: "0.8.0",
    compilerPath: "soljson-v0.8.0+commit.c7dfd78e.js",
  },
  filename: string = "literal.sol"
): Promise<[CompilerInput, CompilerOutput]> {
  await downloadCompiler(compilerOptions.solidityVersion);
  const compiler = await getCompilerForVersion(compilerOptions.solidityVersion);

  return compile(
    getSolcInputForLiteral(source, compilerOptions, filename),
    compiler
  );
}

async function getCompilerForVersion(
  solidityVersion: string
): Promise<Compiler> {
  const compilersCache = await getCompilersDir();
  const downloader = CompilerDownloader.getConcurrencySafeDownloader(
    CompilerPlatform.WASM,
    compilersCache
  );
  const compiler = await downloader.getCompiler(solidityVersion);
  if (compiler === undefined) {
    throw new Error("Expected compiler to be downloaded");
  }

  return compiler;
}

export async function downloadCompiler(solidityVersion: string) {
  const compilersCache = await getCompilersDir();
  const downloader = CompilerDownloader.getConcurrencySafeDownloader(
    CompilerPlatform.WASM,
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
}
