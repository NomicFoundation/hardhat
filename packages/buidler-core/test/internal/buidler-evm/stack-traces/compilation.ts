import download from "download";
import fs from "fs";
import path from "path";
import solcWrapper from "solc/wrapper";

import {
  CompilerInput,
  CompilerOutput,
} from "../../../../src/internal/buidler-evm/stack-traces/compiler-types";

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

async function getSolc(compilerVersion: string): Promise<any> {
  const compilersDir = path.join(__dirname, "compilers");
  const compilerPath = path.join(compilersDir, compilerVersion);

  // download if necessary
  if (!fs.existsSync(compilerPath)) {
    const compilerUrl = `https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/bin/${compilerVersion}`;
    await download(compilerUrl, compilersDir, {
      filename: path.basename(compilerVersion),
    });
  }

  const solc = solcWrapper(loadCompilerSources(compilerPath));

  return solc;
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
