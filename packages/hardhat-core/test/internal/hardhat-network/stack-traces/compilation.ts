import download from "download";
import fs from "fs";
import path from "path";
import solcWrapper from "solc/wrapper";

import {
  CompilerInput,
  CompilerOutput,
} from "../../../../src/internal/hardhat-network/stack-traces/compiler-types";

export interface CompilerOptions {
  solidityVersion: string;
  compilerPath: string;
  runs?: number;
}

function getSolcInput(
  sources: string[],
  compilerOptions: CompilerOptions
): CompilerInput {
  return {
    language: "Solidity",
    sources: Object.assign(
      {},
      ...sources.map((s) => ({
        [path.basename(s)]: { content: fs.readFileSync(s, "utf8") },
      }))
    ),
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
  return path.join(compilersDir, compilerPath);
}

export async function downloadSolc(compilerPath: string): Promise<void> {
  console.log("downloadSolc ", compilerPath);

  const absoluteCompilerPath = getCompilerDownloadPath(compilerPath);

  if (fs.existsSync(absoluteCompilerPath)) {
    console.log("downloadSolc: already existed");
    return;
  }

  const compilerUrl = `https://solc-bin.ethereum.org/bin/${compilerPath}`;

  console.log("downloadSolc: starting download from", compilerUrl);

  await download(compilerUrl, getCompilersDownloadDir(), {
    filename: path.basename(compilerPath),
    timeout: COMPILER_DOWNLOAD_TIMEOUT,
  });

  console.log("downloadSolc: download complete");
}

async function getSolc(compilerPath: string): Promise<any> {
  let absoluteCompilerPath = compilerPath;
  if (!path.isAbsolute(absoluteCompilerPath)) {
    absoluteCompilerPath = getCompilerDownloadPath(compilerPath);
  }

  return solcWrapper(loadCompilerSources(absoluteCompilerPath));
}

export async function compile(
  sources: string[],
  compilerOptions: CompilerOptions
): Promise<[CompilerInput, CompilerOutput]> {
  const input = getSolcInput(sources, compilerOptions);

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
