import fs from "fs";
import path from "path";

import {
  CompilerInput,
  CompilerOutput,
} from "../../../../src/internal/buidler-evm/stack-traces/compiler-types";

function getSolcInput(
  sources: string[],
  withOptimizations = false
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
        enabled: withOptimizations,
        runs: 200,
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

export function compile(
  sources: string[],
  withOptimizations = false
): [CompilerInput, CompilerOutput] {
  const input = getSolcInput(sources, withOptimizations);

  // tslint:disable-next-line no-implicit-dependencies
  const solc = require("solc");

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

export function getSolidityVersion(): string {
  // tslint:disable-next-line no-implicit-dependencies
  return require("solc/package.json").version;
}
