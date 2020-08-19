import { RunTaskFunction } from "@nomiclabs/buidler/types";

import { metadataLengthSize, readSolcMetadataLength } from "./metadata";
import { InferralType } from "./version";

export async function lookupMatchingBytecode(
  contractFiles: CompilerOutput["contracts"],
  deployedBytecode: string,
  inferralType: InferralType
) {
  for (const [contractFilename, contracts] of Object.entries(contractFiles)) {
    for (const [contractName, contract] of Object.entries(contracts)) {
      // Normalize deployed bytecode according to this contract.
      const { deployedBytecode: runtimeBytecodeSymbols } = contract.evm;

      const comparison = await compareBytecode(
        deployedBytecode,
        runtimeBytecodeSymbols,
        inferralType
      );

      if (comparison.match) {
        const {
          contractInformation: {
            immutableValues,
            libraryLinks,
            normalizedBytecode,
          },
        } = comparison;
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

type BytecodeComparison =
  | { match: false }
  | { match: true; contractInformation: BytecodeExtractedData };

interface BytecodeExtractedData {
  immutableValues: ImmutableValues;
  libraryLinks: ResolvedLinks;
  normalizedBytecode: string;
}

export async function compareBytecode(
  deployedBytecode: string,
  runtimeBytecodeSymbols: CompilerOutputBytecode,
  inferralType: InferralType
): Promise<BytecodeComparison> {
  let bytecodeSize = deployedBytecode.length;
  // We will ignore metadata information when comparing. Etherscan seems to do the same.
  if (inferralType !== InferralType.METADATA_ABSENT) {
    // The runtime object may contain nonhexadecimal characters due to link placeholders.
    const runtimeMetadataLength = readSolcMetadataLength(
      Buffer.from(
        runtimeBytecodeSymbols.object.slice(-metadataLengthSize * 2),
        "hex"
      )
    );
    const deployedMetadataLength = readSolcMetadataLength(
      Buffer.from(deployedBytecode, "hex")
    );
    if (
      runtimeBytecodeSymbols.object.length - runtimeMetadataLength * 2 !==
      deployedBytecode.length - deployedMetadataLength * 2
    ) {
      return { match: false };
    }

    // The metadata length is stored at the end.
    bytecodeSize -= (deployedMetadataLength + metadataLengthSize) * 2;
  }

  // Normalize deployed bytecode according to this contract.
  const {
    immutableValues,
    libraryLinks,
    normalizedBytecode,
  } = await normalizeBytecode(deployedBytecode, runtimeBytecodeSymbols);

  // Library hash placeholders are embedded into the bytes where the library addresses are linked.
  // We need to zero them out to compare them.
  const { normalizedBytecode: referenceBytecode } = await normalizeBytecode(
    runtimeBytecodeSymbols.object,
    runtimeBytecodeSymbols
  );

  if (
    normalizedBytecode.slice(0, bytecodeSize - 1) ===
    referenceBytecode.slice(0, bytecodeSize - 1)
  ) {
    // The bytecode matches
    return {
      contractInformation: {
        immutableValues,
        libraryLinks,
        normalizedBytecode,
      },
      match: true,
    };
  }

  return { match: false };
}

interface ResolvedLinks {
  [libraryFileGlobalName: string]: {
    [libraryName: string]: string;
  };
}

interface ImmutableValues {
  [key: string]: string;
}

interface BytecodeSlice {
  start: number;
  length: number;
}

type LinkReferences = CompilerOutputBytecode["linkReferences"][string][string];
type NestedSliceReferences = BytecodeSlice[][];

export async function normalizeBytecode(
  bytecode: string,
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
      if (libraryLinks[filename] === undefined) {
        libraryLinks[filename] = {};
      }
      // We have the bytecode encoded as a hex string
      libraryLinks[filename][libraryName] = `0x${bytecode.slice(
        start * 2,
        (start + length) * 2
      )}`;
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
      immutableValues[key] = bytecode.slice(start * 2, (start + length) * 2);
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
  code: string,
  slices: Array<{ start: number; length: number }>
): string {
  for (const { start, length } of slices) {
    code = [
      code.slice(0, start * 2),
      "0".repeat(length * 2),
      code.slice((start + length) * 2),
    ].join("");
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
      [libraryName: string]: Array<{ start: number; length: 20 }>;
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
