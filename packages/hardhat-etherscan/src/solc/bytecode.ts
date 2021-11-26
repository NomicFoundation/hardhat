import {
  Artifacts,
  BuildInfo,
  CompilerInput,
  CompilerOutput,
  CompilerOutputBytecode,
} from "hardhat/types";
import { parseFullyQualifiedName } from "hardhat/utils/contract-names";

import { inferSolcVersion, measureExecutableSectionLength } from "./metadata";

interface BytecodeExtractedData {
  immutableValues: ImmutableValues;
  libraryLinks: ResolvedLinks;
  normalizedBytecode: string;
}

export interface ResolvedLinks {
  [sourceName: string]: {
    [libraryName: string]: string;
  };
}

interface ImmutableValues {
  [key: string]: string;
}

type SourceName = string;
type ContractName = string;

// TODO: Rework this type?
// This is actually extended by the TASK_VERIFY_GET_CONTRACT_INFORMATION subtask
// to add the libraries that are not detectable to the context.
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

// If the compiler output bytecode is OVM bytecode, we need to make a fix to account for a bug in some versions of
// the OVM compiler. The artifact’s deployedBytecode is incorrect, but because its bytecode (initcode) is correct, when we
// actually deploy contracts, the code that ends up getting stored on chain is also correct. During verification,
// Etherscan will compile the source code, pull out the artifact’s deployedBytecode, and then perform the
// below find and replace, then check that resulting output against the code retrieved on chain from eth_getCode.
// We define the strings for that find and replace here, and use them later so we can know if the bytecode matches
// before it gets to Etherscan. Source: https://github.com/ethereum-optimism/optimism/blob/8d67991aba584c1703692ea46273ea8a1ef45f56/packages/contracts/src/contract-dumps.ts#L195-L204
const ovmFindOpcodes =
  "336000905af158601d01573d60011458600c01573d6000803e3d621234565260ea61109c52";
const ovmReplaceOpcodes =
  "336000905af158600e01573d6000803e3d6000fd5b3d6001141558600a015760016000f35b";

export class Bytecode {
  private _bytecode: string;
  private _version: string;
  private _isOvm: boolean;

  private _executableSection: BytecodeSlice;
  private _metadataSection: BytecodeSlice;

  constructor(bytecode: string) {
    this._bytecode = bytecode;
    const { solcVersion, metadataSectionSizeInBytes } = inferSolcVersion(
      Buffer.from(bytecode, "hex")
    );
    this._version = solcVersion;
    this._executableSection = {
      start: 0,
      length: bytecode.length - metadataSectionSizeInBytes * 2,
    };
    this._metadataSection = {
      start: this._executableSection.length,
      length: metadataSectionSizeInBytes * 2,
    };

    // Check if this is OVM bytecode by looking for the concatenation of the two opcodes defined here:
    // https://github.com/ethereum-optimism/optimism/blob/33cb9025f5e463525d6abe67c8457f81a87c5a24/packages/contracts/contracts/optimistic-ethereum/OVM/execution/OVM_SafetyChecker.sol#L143
    //   - This check would only fail if the EVM solidity compiler didn't use any of the following opcodes: https://github.com/ethereum-optimism/optimism/blob/c42fc0df2790a5319027393cb8fa34e4f7bb520f/packages/contracts/contracts/optimistic-ethereum/iOVM/execution/iOVM_ExecutionManager.sol#L94-L175
    //     This is the list of opcodes that calls the OVM execution manager. But the current solidity
    //     compiler seems to add REVERT in all cases, meaning it currently won't happen and this check
    //     will always be correct.
    //   - It is possible, though very unlikely, that this string appears in the bytecode of an EVM
    //     contract. As a result result, this _isOvm flag should only be used after trying to infer
    //     the solc version
    //   - We need this check because OVM bytecode has no metadata, so when verifying
    //     OVM bytecode the check in `inferSolcVersion` will always return `METADATA_ABSENT_VERSION_RANGE`.
    this._isOvm = bytecode.includes(ovmReplaceOpcodes);
  }

  public getInferredSolcVersion(): string {
    return this._version;
  }

  public isOvmInferred(): boolean {
    return this._isOvm;
  }

  public getExecutableSection(): string {
    const { start, length } = this._executableSection;
    return this._bytecode.slice(start, length);
  }

  public hasMetadata(): boolean {
    return this._metadataSection.length > 0;
  }
}

export async function lookupMatchingBytecode(
  artifacts: Artifacts,
  matchingCompilerVersions: string[],
  deployedBytecode: Bytecode
): Promise<ContractInformation[]> {
  const contractMatches = [];
  const fqNames = await artifacts.getAllFullyQualifiedNames();

  for (const fqName of fqNames) {
    const buildInfo = await artifacts.getBuildInfo(fqName);

    if (buildInfo === undefined) {
      continue;
    }

    if (
      !matchingCompilerVersions.includes(buildInfo.solcVersion) &&
      // if OVM, we will not have matching compiler versions because we can't infer a specific OVM solc version from the bytecode
      !deployedBytecode.isOvmInferred()
    ) {
      continue;
    }

    const { sourceName, contractName } = parseFullyQualifiedName(fqName);

    const contractInformation = await extractMatchingContractInformation(
      sourceName,
      contractName,
      buildInfo,
      deployedBytecode
    );
    if (contractInformation !== null) {
      contractMatches.push(contractInformation);
    }
  }

  return contractMatches;
}

export async function extractMatchingContractInformation(
  sourceName: SourceName,
  contractName: ContractName,
  buildInfo: BuildInfo,
  deployedBytecode: Bytecode
): Promise<ContractInformation | null> {
  const contract = buildInfo.output.contracts[sourceName][contractName];
  // Normalize deployed bytecode according to this contract.
  const { deployedBytecode: runtimeBytecodeSymbols } = contract.evm;

  // If this is OVM bytecode, do the required find and replace (see above comments for more info)
  if (deployedBytecode.isOvmInferred()) {
    runtimeBytecodeSymbols.object = runtimeBytecodeSymbols.object
      .split(ovmFindOpcodes)
      .join(ovmReplaceOpcodes);
  }

  const analyzedBytecode = await compareBytecode(
    deployedBytecode,
    runtimeBytecodeSymbols
  );

  if (analyzedBytecode !== null) {
    return {
      ...analyzedBytecode,
      compilerInput: buildInfo.input,
      compilerOutput: buildInfo.output,
      solcVersion: buildInfo.solcVersion,
      sourceName,
      contractName,
      contract,
    };
  }

  return null;
}

export async function compareBytecode(
  deployedBytecode: Bytecode,
  runtimeBytecodeSymbols: CompilerOutputBytecode
): Promise<BytecodeExtractedData | null> {
  // We will ignore metadata information when comparing. Etherscan seems to do the same.
  const deployedExecutableSection = deployedBytecode.getExecutableSection();
  const runtimeBytecodeExecutableSectionLength = measureExecutableSectionLength(
    runtimeBytecodeSymbols.object
  );

  if (
    deployedExecutableSection.length !==
      runtimeBytecodeExecutableSectionLength &&
    // OVM bytecode has no metadata so we ignore this comparison if operating on OVM bytecode
    !deployedBytecode.isOvmInferred()
  ) {
    return null;
  }

  // Normalize deployed bytecode according to this contract.
  const { immutableValues, libraryLinks, normalizedBytecode } =
    await normalizeBytecode(deployedExecutableSection, runtimeBytecodeSymbols);

  // Library hash placeholders are embedded into the bytes where the library addresses are linked.
  // We need to zero them out to compare them.
  const { normalizedBytecode: referenceBytecode } = await normalizeBytecode(
    runtimeBytecodeSymbols.object,
    runtimeBytecodeSymbols
  );

  if (
    normalizedBytecode.slice(0, deployedExecutableSection.length) ===
    referenceBytecode.slice(0, deployedExecutableSection.length)
  ) {
    // The bytecode matches
    return {
      immutableValues,
      libraryLinks,
      normalizedBytecode,
    };
  }

  return null;
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
