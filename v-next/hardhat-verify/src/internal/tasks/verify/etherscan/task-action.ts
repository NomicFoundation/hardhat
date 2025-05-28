import type { VerifyActionArgs } from "../types.js";
import type { NewTaskActionFunction } from "hardhat/types/tasks";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";

import { Bytecode } from "../../../bytecode.js";
import { getChainDescriptor, getChainId } from "../../../chains.js";
import { encodeConstructorArgs } from "../../../constructor-args.js";
import { ContractInformationResolver } from "../../../contract.js";
import { Etherscan } from "../../../etherscan.js";
import { resolveLibraryInformation } from "../../../libraries.js";
import {
  filterVersionsByRange,
  resolveSupportedSolcVersions,
} from "../../../solc-versions.js";

import { resolveArgs } from "./arg-resolution.js";

const verifyEtherscanAction: NewTaskActionFunction<VerifyActionArgs> = async (
  taskArgs,
  {
    artifacts,
    config,
    globalOptions: { buildProfile: buildProfileName },
    network,
    solidity,
  },
) => {
  if (config.verify.etherscan.enabled === false) {
    // eslint-disable-next-line no-restricted-syntax -- TODO: throw
    throw new Error();
  }

  const { address, constructorArgs, libraries, contract, force } =
    await resolveArgs(taskArgs);

  const buildProfile = config.solidity.profiles[buildProfileName];
  if (buildProfile === undefined) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.SOLIDITY.BUILD_PROFILE_NOT_FOUND,
      {
        buildProfileName,
      },
    );
  }

  const { provider, networkName } = await network.connect();
  const chainId = await getChainId(provider);
  const chainDescriptor = await getChainDescriptor(
    chainId,
    config.chainDescriptors,
    networkName,
  );

  if (chainDescriptor.blockExplorers.etherscan === undefined) {
    // eslint-disable-next-line no-restricted-syntax -- TODO: throw
    throw new Error();
  }

  const etherscan = new Etherscan({
    ...chainDescriptor.blockExplorers.etherscan,
    chainId,
    apiKey: await config.verify.etherscan.apiKey.get(),
  });

  let isVerified = false;
  try {
    isVerified = await etherscan.isVerified(address);
  } catch (error) {
    const isExplorerRequestError = HardhatError.isHardhatError(
      error,
      HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_FAILED,
    );
    if (!force || isExplorerRequestError) {
      throw error;
    }
  }

  if (!force && isVerified) {
    console.log(`The contract ${address} has already been verified on ${etherscan.name}. If you're trying to verify a partially verified contract, please use the --force flag.
${etherscan.getContractUrl(address)}
`);
    return;
  }

  const supportedSolcVersions =
    await resolveSupportedSolcVersions(buildProfile);

  const deployedBytecode = await Bytecode.getDeployedContractBytecode(
    provider,
    address,
    networkName,
  );

  const compatibleSolcVersions = await filterVersionsByRange(
    supportedSolcVersions,
    deployedBytecode.solcVersion,
  );
  if (compatibleSolcVersions.length === 0) {
    const configuredSolcVersionSummary =
      supportedSolcVersions.length > 1
        ? `versions are: ${supportedSolcVersions.join(", ")}`
        : `version is: ${supportedSolcVersions[0]}`;

    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.SOLC_VERSION_MISMATCH,
      {
        configuredSolcVersionSummary,
        deployedSolcVersion: deployedBytecode.solcVersion,
        networkName,
      },
    );
  }

  const contractInformationResolver = new ContractInformationResolver(
    artifacts,
    compatibleSolcVersions,
    networkName,
  );
  const contractInformation = await contractInformationResolver.resolve(
    contract,
    deployedBytecode,
  );

  const libraryInformation = resolveLibraryInformation(
    contractInformation,
    libraries,
  );

  const compilationJob = await solidity.getCompilationJobs(
    [contractInformation.sourceName],
    {
      quiet: true,
    },
  );

  if (!(compilationJob instanceof Map) || compilationJob.size !== 1) {
    // eslint-disable-next-line no-restricted-syntax -- TODO
    throw new Error();
  }

  const compilerInput = await compilationJob
    .get(contractInformation.sourceName)
    ?.getSolcInput();

  assertHardhatInvariant(
    compilerInput !== undefined,
    "The compilation job for the contract source was not found.",
  );

  const encodedConstructorArgs = await encodeConstructorArgs(
    contractInformation.compilerOutputContract.abi,
    constructorArgs,
    contractInformation.contract,
  );
};

export default verifyEtherscanAction;
