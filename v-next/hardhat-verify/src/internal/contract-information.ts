import type {
  ContractInformation,
  ContractWithLibraries,
  LibraryAddresses,
} from "./artifacts.js";
import type { Bytecode } from "./bytecode.js";
import type { ArtifactManager } from "hardhat/types/artifacts";
import type { EthereumProvider } from "hardhat/types/providers";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { getBuildInfo } from "./artifacts.js";

export async function resolveContractInformation(
  artifacts: ArtifactManager,
  provider: EthereumProvider,
  deployedBytecode: Bytecode,
  compatibleSolcVersions: string[],
  libraries: LibraryAddresses,
  contract: string | undefined,
  networkName: string,
): Promise<ContractWithLibraries> {
  let contractInformation: ContractInformation | null;

  if (contract !== undefined) {
    const artifactExists = await artifacts.artifactExists(contract);

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

    const buildInfo = await getBuildInfo(artifacts, contract);
    if (buildInfo === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.BUILD_INFO_NOT_FOUND,
        {
          contract,
        },
      );
    }

    if (!compatibleSolcVersions.includes(buildInfo.solcVersion)) {
      const versionDetails = deployedBytecode.hasVersionRange()
        ? `a Solidity version in the range ${deployedBytecode.solcVersion}`
        : `the Solidity version ${deployedBytecode.solcVersion}`;

      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.BUILD_INFO_SOLC_VERSION_MISMATCH,
        {
          contract,
          buildInfoSolcVersion: buildInfo.solcVersion,
          networkName,
          versionDetails,
        },
      );
    }

    /*     contractInformation = extractMatchingContractInformation(
      contract,
      buildInfo,
      deployedBytecode,
    );

    if (contractInformation === null) {
      throw new DeployedBytecodeMismatchError(networkName, contract);
    } */
  } else {
    /*     contractInformation = await extractInferredContractInformation(
      artifacts,
      provider,
      compatibleSolcVersions,
      deployedBytecode,
    ); */
  }

  // map contractInformation libraries
  /*   const libraryInformation = await getLibraryInformation(
    contractInformation,
    libraries,
  );

  return {
    ...contractInformation,
    ...libraryInformation,
  }; */
}
