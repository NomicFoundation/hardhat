import {
  Artifacts,
  CompilerInput,
  CompilerOutput,
  CompilerOutputBytecode,
} from "hardhat/types";
import { parseFullyQualifiedName } from "hardhat/utils/contract-names";

import { METADATA_LENGTH_SIZE, readSolcMetadataLength } from "./metadata";
import { InferralType } from "./version";

type BytecodeComparison =
  | { match: false }
  | { match: true; contractInformation: BytecodeExtractedData };

interface BytecodeExtractedData {
  immutableValues: ImmutableValues;
  libraryLinks: ResolvedLinks;
  normalizedBytecode: string;
}

interface ResolvedLinks {
  [sourceName: string]: {
    [libraryName: string]: string;
  };
}

interface ImmutableValues {
  [key: string]: string;
}

type SourceName = string;
type ContractName = string;

export interface ContractInformation extends BytecodeExtractedData {
  compilerInput: CompilerInput;
  compilerOutput: CompilerOutput;
  solcVersion: string;
  sourceName: SourceName;
  contractName: ContractName;
  contract: CompilerOutput["contracts"][SourceName][ContractName];
}

interface BytecodeSlice {
  start: number;
  length: number;
}

type NestedSliceReferences = BytecodeSlice[][];

export async function lookupMatchingBytecode(
  artifacts: Artifacts,
  matchingVersions: string[],
  deployedBytecode: string,
  inferralType: InferralType
): Promise<ContractInformation[]> {
  const contractMatches = [];
  const fqNames = await artifacts.getAllFullyQualifiedNames();

  for (const fqName of fqNames) {
    const buildInfo = await artifacts.getBuildInfo(fqName);

    if (buildInfo === undefined) {
      continue;
    }

    if (!matchingVersions.includes(buildInfo.solcVersion)) {
      continue;
    }

    const { sourceName, contractName } = parseFullyQualifiedName(fqName);
    const contract = buildInfo.output.contracts[sourceName][contractName];
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
      contractMatches.push({
        compilerInput: buildInfo.input,
        compilerOutput: buildInfo.output,
        solcVersion: buildInfo.solcVersion,
        immutableValues,
        libraryLinks,
        normalizedBytecode,
        sourceName,
        contractName,
        contract,
      });
    }
  }

  return contractMatches;
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
    // `Buffer.from` will return a buffer that contains bytes up until the last decodable byte.
    // To work around this we'll just slice the relevant part of the bytecode.
    const runtimeBytecodeSlice = Buffer.from(
      runtimeBytecodeSymbols.object.slice(-METADATA_LENGTH_SIZE * 2),
      "hex"
    );

    // If, for whatever reason, the runtime bytecode object is so small that we can't even read two bytes off it,
    // this is not a match.
    if (runtimeBytecodeSlice.length !== METADATA_LENGTH_SIZE) {
      return { match: false };
    }

    const runtimeMetadataLength = readSolcMetadataLength(runtimeBytecodeSlice);
    const deployedMetadataLength = readSolcMetadataLength(
      Buffer.from(deployedBytecode, "hex")
    );

    // If the bytecode itself is of different length, this is not a match.
    if (
      runtimeBytecodeSymbols.object.length - runtimeMetadataLength * 2 !==
      deployedBytecode.length - deployedMetadataLength * 2
    ) {
      return { match: false };
    }

    // The metadata length is stored at the end.
    bytecodeSize -= (deployedMetadataLength + METADATA_LENGTH_SIZE) * 2;
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

export async function normalizeBytecode(
  bytecode: string,
  symbols: CompilerOutputBytecode
): Promise<BytecodeExtractedData> {
  const nestedSliceReferences: NestedSliceReferences = [];
  const libraryLinks: ResolvedLinks = {};
  for (const [sourceName, libraries] of Object.entries(
    symbols.linkReferences
  )) {
    for (const [libraryName, linkReferences] of Object.entries(libraries)) {
      // Is this even a possibility?
      if (linkReferences.length === 0) {
        continue;
      }

      const { start, length } = linkReferences[0];
      if (libraryLinks[sourceName] === undefined) {
        libraryLinks[sourceName] = {};
      }
      // We have the bytecode encoded as a hex string
      libraryLinks[sourceName][libraryName] = `0x${bytecode.slice(
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

  // To normalize a library object we need to take into account its call protection mechanism.
  // See https://solidity.readthedocs.io/en/latest/contracts.html#call-protection-for-libraries
  const addressSize = 20;
  const push20OpcodeHex = "73";
  const pushPlaceholder = push20OpcodeHex + "0".repeat(addressSize * 2);
  if (
    symbols.object.startsWith(pushPlaceholder) &&
    bytecode.startsWith(push20OpcodeHex)
  ) {
    nestedSliceReferences.push([{ start: 1, length: addressSize }]);
  }

  const sliceReferences = flattenSlices(nestedSliceReferences);
  const normalizedBytecode = zeroOutSlices(bytecode, sliceReferences);

  return { libraryLinks, immutableValues, normalizedBytecode };
}

function flattenSlices(slices: NestedSliceReferences) {
  return ([] as BytecodeSlice[]).concat(...slices);
}

function zeroOutSlices(
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
