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

export async function downloadSolc(compilerPath: string): Promise<void> {
  console.log("downloadSolc 1");

  const compilersDir = path.join(__dirname, "compilers");
  const absoluteCompilerPath = path.join(compilersDir, compilerPath);

  console.log("downloadSolc 2");

  if (fs.existsSync(absoluteCompilerPath)) {
    return;
  }

  console.log("downloadSolc 3");

  const compilerUrl = `https://solc-bin.ethereum.org/bin/${compilerPath}`;

  console.log({ compilerPath });

  await download(compilerUrl, compilersDir, {
    filename: path.basename(compilerPath),
    timeout: COMPILER_DOWNLOAD_TIMEOUT,
  });

  console.log("downloadSolc 4");
}

async function getSolc(compilerPath: string): Promise<any> {
  console.log("getSolc 1");

  let absoluteCompilerPath = compilerPath;
  if (!path.isAbsolute(absoluteCompilerPath)) {
    console.log("getSolc 2");

    const compilersDir = path.join(__dirname, "compilers");
    absoluteCompilerPath = path.join(compilersDir, compilerPath);
  }

  console.log("getSolc 3");

  const solc = solcWrapper(loadCompilerSources(absoluteCompilerPath));

  console.log("getSolc 4");

  return solc;
}

export async function compile(
  sources: string[],
  compilerOptions: CompilerOptions
): Promise<[CompilerInput, CompilerOutput]> {
  console.log("compile 1");
  const input = getSolcInput(sources, compilerOptions);

  console.log("compile 2");
  const solc = await getSolc(compilerOptions.compilerPath);

  console.log("compile 3");
  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  console.log("compile 4");
  if (output.errors) {
    for (const error of output.errors) {
      if (error.severity === "error") {
        throw new Error(`Failed to compile: ${error.message}`);
      }
    }
  }

  console.log("compile 5");

  return [input, output];
}
