import type { CompilerInput } from "../../../types/solidity.js";

export const DEFAULT_OUTPUT_SELECTION: CompilerInput["settings"]["outputSelection"] =
  {
    "*": {
      "": ["ast"],
      "*": [
        "abi",
        "evm.bytecode.linkReferences",
        "evm.bytecode.object",
        "evm.bytecode.opcodes",
        "evm.bytecode.sourceMap",
        "evm.deployedBytecode.immutableReferences",
        "evm.deployedBytecode.linkReferences",
        "evm.deployedBytecode.object",
        "evm.deployedBytecode.opcodes",
        "evm.deployedBytecode.sourceMap",
        "evm.methodIdentifiers",
      ],
    },
  };

// This is the default that solc uses, which we also use during resolution
export const SOLC_DEFAULT_OPTIMIZER_RUNS = 200;
