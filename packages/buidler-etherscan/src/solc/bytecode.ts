import {
  CompilerInput,
  CompilerOutput,
  CompilerOutputBytecode,
} from "@nomiclabs/buidler/src/internal/buidler-evm/stack-traces/compiler-types";
import { RunTaskFunction } from "@nomiclabs/buidler/types";

import { readSolcMetadataLength } from "./metadata";
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

      let bytecodeSize = deployedBytecode.length;
      if (inferralType !== InferralType.METADATA_ABSENT) {
        // We will ignore metadata information when comparing. Etherscan seems to do the same.
        const metadataLength = readSolcMetadataLength(deployedBytecode);
        bytecodeSize -= metadataLength;
      }

      if (
        normalizedBytecode.compare(
          runtimeBytecodeObject,
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

async function normalizeBytecode(
  bytecode: Buffer,
  symbols: CompilerOutputBytecode
) {
  const { zeroOutSlices } = await import(
    "@nomiclabs/buidler/src/internal/buidler-evm/stack-traces/library-utils"
  );

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

interface CompilerLinkInput {
  settings: {
    libraries?: ResolvedLinks;
  };
}

type CompilerExtendedInput = CompilerInput & CompilerLinkInput;

// TODO: This is extremely ugly and should be replaced with better build primitives when possible.
// Ideally, we would access the input and output through some sort of artifact.
export async function compile(taskRun: RunTaskFunction) {
  const {
    TASK_COMPILE_COMPILE,
    TASK_COMPILE_GET_COMPILER_INPUT,
  } = await import("@nomiclabs/buidler/builtin-tasks/task-names");

  const compilerInput = (await taskRun(
    TASK_COMPILE_GET_COMPILER_INPUT
  )) as CompilerExtendedInput;
  const compilerOutput = (await taskRun(
    TASK_COMPILE_COMPILE
  )) as CompilerOutput;
  return { compilerInput, compilerOutput };
}
