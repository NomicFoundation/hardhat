import type { BuildInfoAndOutput } from "./artifacts.js";
import type { Bytecode } from "./bytecode.js";
import type { ArtifactManager } from "hardhat/types/artifacts";
import type {
  CompilerInput,
  CompilerOutputContract,
} from "hardhat/types/solidity";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import {
  getFullyQualifiedName,
  parseFullyQualifiedName,
} from "hardhat/utils/contract-names";

import { getBuildInfoAndOutput } from "./artifacts.js";

export interface ContractInformation {
  compilerInput: CompilerInput;
  solcLongVersion: string;
  sourceName: string;
  userFqn: string;
  inputFqn: string;
  compilerOutputContract: CompilerOutputContract;
  deployedBytecode: string;
}

/**
 * Resolves on-chain bytecode back to a locally compiled contract,
 * either by explicit FQN or by scanning all artifacts.
 *
 * Throws if:
 *  - no build info is found;
 *  - the compiler versions are incompatible;
 *  - the deployed bytecode doesn’t match;
 *  - zero or multiple matches in inference mode.
 */
// TODO: add tests once the todos in getBuildInfoAndOutput are resolved.
export class ContractInformationResolver {
  readonly #artifacts: ArtifactManager;
  readonly #compatibleSolcVersions: string[];
  readonly #networkName: string;

  constructor(
    artifacts: ArtifactManager,
    compatibleSolcVersions: string[],
    networkName: string,
  ) {
    this.#artifacts = artifacts;
    this.#compatibleSolcVersions = compatibleSolcVersions;
    this.#networkName = networkName;
  }

  public async resolve(
    contract: string | undefined,
    deployedBytecode: Bytecode,
  ): Promise<ContractInformation> {
    if (contract !== undefined) {
      return this.#resolveByFqn(contract, deployedBytecode);
    } else {
      return this.#resolveByBytecodeLookup(deployedBytecode);
    }
  }

  /**
   * Resolves a contract by its fully qualified name by comparing its compiled
   * build info against the on-chain bytecode.
   *
   * @param contract The fully qualified contract name (e.g. "contracts/Token.sol:Token").
   * @param deployedBytecode The on-chain bytecode wrapped in a Bytecode instance.
   * @returns The matching ContractInformation.
   * @throws {HardhatError} with the descriptor:
   *   - CONTRACT_NOT_FOUND if the artifact for the contract does not exist.
   *   - BUILD_INFO_NOT_FOUND if no build info is found for the contract.
   *   - BUILD_INFO_SOLC_VERSION_MISMATCH if the build info’s solc version
   *     is incompatible with the deployed bytecode.
   *   - DEPLOYED_BYTECODE_MISMATCH if the compiled and deployed bytecodes
   *     do not match.
   */
  async #resolveByFqn(
    contract: string,
    deployedBytecode: Bytecode,
  ): Promise<ContractInformation> {
    const artifactExists = await this.#artifacts.artifactExists(contract);
    if (!artifactExists) {
      // TODO: we could use HardhatError.ERRORS.CORE.ARTIFACTS.NOT_FOUND
      // but we need to build the "suggestion" string, like in #throwNotFoundError
      // within the artifacts manager
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONTRACT_NOT_FOUND,
        {
          contract,
        },
      );
    }

    const buildInfoAndOutput = await getBuildInfoAndOutput(
      this.#artifacts,
      contract,
    );
    if (buildInfoAndOutput === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.BUILD_INFO_NOT_FOUND,
        {
          contract,
        },
      );
    }

    const isSolcVersionCompatible = this.#compatibleSolcVersions.includes(
      buildInfoAndOutput.buildInfo.solcVersion,
    );
    if (!isSolcVersionCompatible) {
      const versionDetails = deployedBytecode.hasVersionRange()
        ? `a Solidity version in the range ${deployedBytecode.solcVersion}`
        : `the Solidity version ${deployedBytecode.solcVersion}`;

      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.BUILD_INFO_SOLC_VERSION_MISMATCH,
        {
          contract,
          buildInfoSolcVersion: buildInfoAndOutput.buildInfo.solcVersion,
          networkName: this.#networkName,
          versionDetails,
        },
      );
    }

    const contractInformation = this.#matchAndBuild(
      contract,
      buildInfoAndOutput,
      deployedBytecode,
    );
    if (contractInformation === null) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.DEPLOYED_BYTECODE_MISMATCH,
        { contractDescription: `the contract "${contract}"` },
      );
    }

    return contractInformation;
  }

  /**
   * Infers a contract by scanning all artifacts and matching their compiled
   * bytecode against the on-chain bytecode.
   *
   * @param deployedBytecode The on-chain bytecode wrapped in a Bytecode instance.
   * @returns The matching ContractInformation.
   * @throws {HardhatError} with the descriptor:
   *   - DEPLOYED_BYTECODE_MISMATCH if no matching contracts are found.
   *   - DEPLOYED_BYTECODE_MULTIPLE_MATCHES if more than one matching contract
   *     is found.
   */
  async #resolveByBytecodeLookup(
    deployedBytecode: Bytecode,
  ): Promise<ContractInformation> {
    const candidates = await this.#artifacts.getAllFullyQualifiedNames();
    const matches: ContractInformation[] = [];

    for (const contract of candidates) {
      const buildInfoAndOutput = await getBuildInfoAndOutput(
        this.#artifacts,
        contract,
      );
      if (buildInfoAndOutput === undefined) {
        // TODO: can this happen? should we throw an error?
        continue;
      }

      const isSolcVersionCompatible = this.#compatibleSolcVersions.includes(
        buildInfoAndOutput.buildInfo.solcVersion,
      );
      if (!isSolcVersionCompatible) {
        continue;
      }

      const contractInformation = this.#matchAndBuild(
        contract,
        buildInfoAndOutput,
        deployedBytecode,
      );
      if (contractInformation !== null) {
        matches.push(contractInformation);
      }
    }

    if (matches.length === 0) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.DEPLOYED_BYTECODE_MISMATCH,
        { contractDescription: "any of your local contracts" },
      );
    }

    if (matches.length > 1) {
      const fqnList = matches.map((c) => `  * ${c.userFqn}`).join("\n");

      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.DEPLOYED_BYTECODE_MULTIPLE_MATCHES,
        { fqnList },
      );
    }

    return matches[0];
  }

  /**
   * Compares on-chain bytecode against the compiled deployedBytecode in the
   * build output, and assembles a ContractInformation object if they match.
   *
   * @param contract The fully qualified contract name (e.g. "src/A.sol:MyA").
   * @param buildInfoAndOutput An object containing the compiler’s BuildInfo
   * and its Output.
   * @param deployedBytecode The on-chain bytecode wrapped in a Bytecode instance.
   * @returns A ContractInformation object when the compiled and deployed bytecodes
   * match, or `null` otherwise.
   * @throws {HardhatError} If the compiled contract output or its deployedBytecode
   * is missing in the build output.
   */
  #matchAndBuild(
    contract: string,
    { buildInfo, buildInfoOutput }: BuildInfoAndOutput,
    deployedBytecode: Bytecode,
  ): ContractInformation | null {
    const { sourceName, contractName } = parseFullyQualifiedName(contract);
    const inputSourceName = buildInfo.userSourceNameMap[sourceName];

    const compilerOutputContract =
      buildInfoOutput.output.contracts?.[inputSourceName]?.[contractName];

    // TODO: can this happen after validating the artifact and build info? should we throw an error?
    assertHardhatInvariant(
      compilerOutputContract !== undefined,
      "The compiled contract output was not found in the build info.",
    );

    const compilerOutputBytecode =
      compilerOutputContract?.evm?.deployedBytecode;

    // TODO: can this happen after validating the artifact and build info? should we throw an error?
    assertHardhatInvariant(
      compilerOutputBytecode !== undefined,
      "The deployed bytecode of the compiled contract was not found in the build info.",
    );

    if (deployedBytecode.compare(compilerOutputBytecode)) {
      return {
        compilerInput: buildInfo.input,
        solcLongVersion: buildInfo.solcLongVersion,
        sourceName,
        userFqn: contract,
        inputFqn: getFullyQualifiedName(inputSourceName, contractName),
        compilerOutputContract,
        deployedBytecode: deployedBytecode.bytecode,
      };
    }

    return null;
  }
}
