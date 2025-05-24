import type { VerifyActionArgs } from "../types.js";
import type { NewTaskActionFunction } from "hardhat/types/tasks";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { Bytecode } from "../../../bytecode.js";
import { getChainDescriptor, getChainId } from "../../../chains.js";
import {
  filterVersionsByRange,
  resolveSupportedCompilerVersions,
} from "../../../compiler-versions.js";
import { Etherscan } from "../../../etherscan.js";

import { resolveArgs } from "./arg-resolution.js";

const verifyEtherscanAction: NewTaskActionFunction<VerifyActionArgs> = async (
  taskArgs,
  { config, network, globalOptions: { buildProfile: buildProfileName } },
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

  const supportedCompilerVersions =
    await resolveSupportedCompilerVersions(buildProfile);

  const deployedBytecode = await Bytecode.getDeployedContractBytecode(
    provider,
    address,
    networkName,
  );

  const matchingCompilerVersions = await filterVersionsByRange(
    supportedCompilerVersions,
    deployedBytecode.compilerVersion,
  );
  if (matchingCompilerVersions.length === 0) {
    const configuredCompilerVersionSummary =
      supportedCompilerVersions.length > 1
        ? `versions are: ${supportedCompilerVersions.join(", ")}`
        : `version is: ${supportedCompilerVersions[0]}`;

    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.COMPILER_VERSION_MISMATCH,
      {
        configuredCompilerVersionSummary,
        deployedCompilerVersion: deployedBytecode.compilerVersion,
        networkName,
      },
    );
  }
};

export default verifyEtherscanAction;
