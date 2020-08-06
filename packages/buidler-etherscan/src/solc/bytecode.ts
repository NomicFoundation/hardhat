import { RunTaskFunction } from "@nomiclabs/buidler/types";

import { metadataLengthSize, readSolcMetadataLength } from "./metadata";
import { InferralType } from "./SolcVersions";

export async function lookupMatchingBytecode(
  contractFiles: CompilerOutput["contracts"],
  deployedBytecode: Buffer,
  inferralType: InferralType
) {
  for (const [contractFilename, contracts] of Object.entries(contractFiles)) {
    for (const [contractName, contract] of Object.entries(contracts)) {
      // Normalize deployed bytecode according to this contract.
      const { deployedBytecode: runtimeBytecode } = contract.evm;

      const runtimeBytecodeObject = Buffer.from(runtimeBytecode.object, "hex");
      if (runtimeBytecodeObject.length !== deployedBytecode.length) {
        continue;
      }

      const {
        immutableValues,
        libraryLinks,
        normalizedBytecode,
      } = await normalizeBytecode(deployedBytecode, runtimeBytecode);

      // Library hash placeholders are embedded into the bytes where the library addresses are linked.
      // We need to zero them out to compare them.
      const { normalizedBytecode: referenceBytecode } = await normalizeBytecode(
        runtimeBytecodeObject,
        runtimeBytecode
      );

      let bytecodeSize = deployedBytecode.length;
      if (inferralType !== InferralType.METADATA_ABSENT) {
        // We will ignore metadata information when comparing. Etherscan seems to do the same.
        const metadataLength = readSolcMetadataLength(deployedBytecode);
        // The metadata length is stored at the end.
        bytecodeSize -= metadataLength + metadataLengthSize;
      }

      if (
        normalizedBytecode.compare(
          referenceBytecode,
          0,
          bytecodeSize,
          0,
          bytecodeSize
        ) === 0
      ) {
        // The bytecode matches
        return {
          immutableValues,
          libraryLinks,
          normalizedBytecode,
          contractFilename,
          contractName,
          contract,
        };
      }
    }
  }

  return null;
}

interface ResolvedLinks {
  [libraryFileGlobalName: string]: {
    [libraryName: string]: string;
  };
}

interface ImmutableValues {
  [key: string]: Buffer;
}

interface BytecodeSlice {
  start: number;
  length: number;
}

type LinkReferences = CompilerOutputBytecode["linkReferences"][string][string];
type NestedSliceReferences = BytecodeSlice[][];

export async function normalizeBytecode(
  bytecode: Buffer,
  symbols: CompilerOutputBytecode
) {
  const nestedSliceReferences: NestedSliceReferences = [];
  const libraryLinks: ResolvedLinks = {};
  for (const [filename, libraries] of Object.entries(symbols.linkReferences)) {
    for (const [libraryName, linkReferences] of Object.entries(libraries)) {
      // Is this even a possibility?
      if (linkReferences.length === 0) {
        continue;
      }

      const { start, length } = linkReferences[0];
      libraryLinks[filename][libraryName] = `0x${bytecode
        .slice(start, length)
        .toString("hex")}`;
      nestedSliceReferences.push(linkReferences);
    }
  }

  const immutableValues: ImmutableValues = {};
  if (
    symbols.immutableReferences !== undefined &&
    symbols.immutableReferences !== null
  ) {
    for (const [key, immutableReferences] of Object.entries(
      symbols.immutableReferences
    )) {
      // Is this even a possibility?
      if (immutableReferences.length === 0) {
        continue;
      }

      const { start, length } = immutableReferences[0];
      immutableValues[key] = bytecode.slice(start, length);
      nestedSliceReferences.push(immutableReferences);
    }
  }

  const sliceReferences: BytecodeSlice[] = ([] as BytecodeSlice[]).concat(
    ...nestedSliceReferences
  );
  const normalizedBytecode = zeroOutSlices(bytecode, sliceReferences);

  return { libraryLinks, immutableValues, normalizedBytecode };
}

export function zeroOutSlices(
  code: Buffer,
  slices: Array<{ start: number; length: number }>
): Buffer {
  for (const { start, length } of slices) {
    code = Buffer.concat([
      code.slice(0, start),
      Buffer.alloc(length, 0),
      code.slice(start + length),
    ]);
  }

  return code;
}

/* Taken from stack trace buidlerevm internals
 *  This is not an exhaustive interface for compiler input nor output.
 */

export interface CompilerInput {
  language: "Solidity";
  sources: { [fileGlobalName: string]: { content: string } };
  settings: {
    optimizer: { runs: number; enabled: boolean };
    evmVersion?: string;
    libraries?: ResolvedLinks;
  };
}

export interface CompilerOutput {
  contracts: {
    [globalName: string]: {
      [contractName: string]: {
        abi: any;
        evm: {
          bytecode: CompilerOutputBytecode;
          deployedBytecode: CompilerOutputBytecode;
        };
      };
    };
  };
}

export interface CompilerOutputBytecode {
  object: string;
  linkReferences: {
    [libraryFileGlobalName: string]: {
      [libraryName: string]: Array<{ start: 0; length: 20 }>;
    };
  };
  immutableReferences?: {
    [key: string]: Array<{ start: number; length: number }>;
  };
}

/**/

// TODO: This is extremely ugly and should be replaced with better build primitives when possible.
// Ideally, we would access the input and output through some sort of artifact.
export async function compile(taskRun: RunTaskFunction) {
  const {
    TASK_COMPILE_COMPILE,
    TASK_COMPILE_GET_COMPILER_INPUT,
  } = await import("@nomiclabs/buidler/builtin-tasks/task-names");

  const compilerInput = (await taskRun(
    TASK_COMPILE_GET_COMPILER_INPUT
  )) as CompilerInput;
  const compilerOutput = (await taskRun(
    TASK_COMPILE_COMPILE
  )) as CompilerOutput;
  return { compilerInput, compilerOutput };
}
