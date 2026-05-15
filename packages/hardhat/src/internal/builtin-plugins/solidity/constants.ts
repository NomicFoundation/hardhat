import type { CompilerInput } from "../../../types/solidity.js";

/**
 * The input source name prefix used for files belonging to the Hardhat
 * project (as opposed to npm packages, which use `npm/<pkg>@<version>`).
 *
 * For example, a project file at `<root>/contracts/Foo.sol` has input
 * source name `project/contracts/Foo.sol`. Part of the build-info format
 * contract: changing this value would require a new build-info format
 * version.
 */
export const HARDHAT_PROJECT_INPUT_SOURCE_NAME_ROOT = "project";

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
