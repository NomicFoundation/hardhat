import fs from "fs";
import path from "path";
import solcWrapper from "solc/wrapper";

import { download } from "../../../../src/internal/util/download";
import { CompilerInput, CompilerOutput } from "../../../../src/types";

export interface CompilerOptions {
  solidityVersion: string;
  compilerPath: string;
  runs?: number;
}

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
  compilerOptions: CompilerOptions
): CompilerInput {
  return {
    language: "Solidity",
    sources,
    settings: {
      optimizer: {
        enabled: compilerOptions.runs !== undefined,
        runs: compilerOptions.runs ?? 200,
      },
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
    },
  };
}

function getSolcInputForFiles(
  sources: string[],
  compilerOptions: CompilerOptions
): CompilerInput {
  return getSolcInput(getSolcSourceFileMapping(sources), compilerOptions);
}

function getSolcInputForLiteral(
  source: string,
  compilerOptions: CompilerOptions,
  filename: string = "literal.sol"
): CompilerInput {
  return getSolcInput({ [filename]: { content: source } }, compilerOptions);
}

/**
 * Copied from `solidity/compiler/index.ts`.
 */
function loadCompilerSources(compilerPath: string) {
  const Module = module.constructor as any;
  const previousHook = Module._extensions[".js"];

  Module._extensions[".js"] = function (
    module: NodeJS.Module,
    filename: string
  ) {
    const content = fs.readFileSync(filename, "utf8");
    Object.getPrototypeOf(module)._compile.call(module, content, filename);
  };

  const loadedSolc = require(compilerPath);

  Module._extensions[".js"] = previousHook;

  return loadedSolc;
}

export const COMPILER_DOWNLOAD_TIMEOUT = 10000;

function getCompilersDownloadDir() {
  return path.join(__dirname, "compilers");
}

function getCompilerDownloadPath(compilerPath: string) {
  const compilersDir = getCompilersDownloadDir();
  return path.resolve(compilersDir, compilerPath);
}

export async function downloadSolc(compilerPath: string): Promise<void> {
  const absoluteCompilerPath = getCompilerDownloadPath(compilerPath);
  const compilerUrl = `https://solc-bin.ethereum.org/bin/${compilerPath}`;

  if (fs.existsSync(absoluteCompilerPath)) {
    return;
  }

  await download(compilerUrl, absoluteCompilerPath, COMPILER_DOWNLOAD_TIMEOUT);
}

async function getSolc(compilerPath: string): Promise<any> {
  const isAbsolutePath = path.isAbsolute(compilerPath);

  if (!isAbsolutePath) {
    await downloadSolc(compilerPath);
  }

  const absoluteCompilerPath = isAbsolutePath
    ? compilerPath
    : getCompilerDownloadPath(compilerPath);

  return solcWrapper(loadCompilerSources(absoluteCompilerPath));
}

async function compile(
  input: CompilerInput,
  compilerOptions: CompilerOptions
): Promise<[CompilerInput, CompilerOutput]> {
  const solc = await getSolc(compilerOptions.compilerPath);

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
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
  compilerOptions: CompilerOptions
): Promise<[CompilerInput, CompilerOutput]> {
  return compile(
    getSolcInputForFiles(sources, compilerOptions),
    compilerOptions
  );
}

export async function compileLiteral(
  source: string,
  compilerOptions: CompilerOptions = {
    solidityVersion: "0.8.0",
    compilerPath: "soljson-v0.8.0+commit.c7dfd78e.js",
    runs: 1,
  },
  filename: string = "literal.sol"
): Promise<[CompilerInput, CompilerOutput]> {
  return compile(
    getSolcInputForLiteral(source, compilerOptions, filename),
    compilerOptions
  );
}
