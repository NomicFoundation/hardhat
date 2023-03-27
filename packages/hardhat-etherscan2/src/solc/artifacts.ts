import { parseFullyQualifiedName } from "hardhat/utils/contract-names";
import {
  Artifacts,
  BuildInfo,
  CompilerOutputBytecode,
  Network,
} from "hardhat/types";
import {
  DeployedBytecodeMismatchError,
  DeployedBytecodeMultipleMatchesError,
} from "../errors";
import { Bytecode, ContractInformation } from "./bytecode";

export interface ByteOffset {
  start: number;
  length: number;
}

export const getLibrariesOffsets = (
  linkReferences: CompilerOutputBytecode["linkReferences"] = {}
): ByteOffset[] => {
  const offsets: ByteOffset[] = [];
  for (const libraries of Object.values(linkReferences)) {
    for (const libraryOffset of Object.values(libraries)) {
      offsets.push(...libraryOffset);
    }
  }
  return offsets;
};

export const getImmutableValuesOffsets = (
  immutableReferences: CompilerOutputBytecode["immutableReferences"] = {}
): ByteOffset[] => {
  const offsets: ByteOffset[] = [];
  for (const immutableValueOffset of Object.values(immutableReferences)) {
    offsets.push(...immutableValueOffset);
  }
  return offsets;
};

/**
 * To normalize a library object we need to take into account its call protection mechanism.
 * See https://solidity.readthedocs.io/en/latest/contracts.html#call-protection-for-libraries
 */
export const getCallProtectionOffsets = (
  bytecode: string,
  referenceBytecode: string
): ByteOffset[] => {
  const offsets: ByteOffset[] = [];
  const addressSize = 20;
  const push20OpcodeHex = "73";
  const pushPlaceholder = push20OpcodeHex + "0".repeat(addressSize * 2);
  if (
    referenceBytecode.startsWith(pushPlaceholder) &&
    bytecode.startsWith(push20OpcodeHex)
  ) {
    offsets.push({ start: 1, length: addressSize });
  }
  return offsets;
};

export const extractMatchingContractInformation = (
  contractFQN: string,
  buildInfo: BuildInfo,
  bytecode: Bytecode
): ContractInformation | null => {
  const { sourceName, contractName } = parseFullyQualifiedName(contractFQN);
  const contractOutput = buildInfo.output.contracts[sourceName][contractName];
  // Normalize deployed bytecode according to this object
  const compilerOutputDeployedBytecode = contractOutput.evm.deployedBytecode;

  if (bytecode.compare(compilerOutputDeployedBytecode)) {
    return {
      compilerInput: buildInfo.input,
      solcVersion: buildInfo.solcVersion,
      sourceName,
      contractName,
      contractOutput,
    };
  }

  return null;
};

export const extractInferredContractInformation = async (
  artifacts: Artifacts,
  network: Network,
  matchingCompilerVersions: string[],
  bytecode: Bytecode
): Promise<ContractInformation> => {
  const contractMatches = await lookupMatchingBytecode(
    artifacts,
    matchingCompilerVersions,
    bytecode
  );

  if (contractMatches.length === 0) {
    throw new DeployedBytecodeMismatchError(network.name);
  }

  if (contractMatches.length > 1) {
    const fqnMatches = contractMatches.map(
      ({ sourceName, contractName }) => `${sourceName}:${contractName}`
    );
    throw new DeployedBytecodeMultipleMatchesError(fqnMatches);
  }

  return contractMatches[0];
};

const lookupMatchingBytecode = async (
  artifacts: Artifacts,
  matchingCompilerVersions: string[],
  bytecode: Bytecode
): Promise<ContractInformation[]> => {
  const contractMatches: ContractInformation[] = [];
  const fqNames = await artifacts.getAllFullyQualifiedNames();

  for (const fqName of fqNames) {
    const buildInfo = await artifacts.getBuildInfo(fqName);

    if (buildInfo === undefined) {
      continue;
    }

    if (
      !matchingCompilerVersions.includes(buildInfo.solcVersion) &&
      // if OVM, we will not have matching compiler versions because we can't infer a specific OVM solc version from the bytecode
      !bytecode.isOvm()
    ) {
      continue;
    }

    const contractInformation = extractMatchingContractInformation(
      fqName,
      buildInfo,
      bytecode
    );
    if (contractInformation !== null) {
      contractMatches.push(contractInformation);
    }
  }

  return contractMatches;
};
