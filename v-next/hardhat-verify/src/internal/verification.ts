import type { ContractInformation } from "./contract.js";
import type { LibraryAddresses } from "./libraries.js";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { isAddress } from "@nomicfoundation/hardhat-utils/eth";
import { sleep } from "@nomicfoundation/hardhat-utils/lang";
import { isFullyQualifiedName } from "hardhat/utils/contract-names";

import { getCompilerInput } from "./artifacts.js";
import { Bytecode } from "./bytecode.js";
import { getChainDescriptor, getChainId } from "./chains.js";
import { encodeConstructorArgs } from "./constructor-args.js";
import { ContractInformationResolver } from "./contract.js";
import { Etherscan } from "./etherscan.js";
import { resolveLibraryInformation } from "./libraries.js";
import {
  filterVersionsByRange,
  resolveSupportedSolcVersions,
} from "./solc-versions.js";

export interface VerifyContractArgs {
  address: string;
  constructorArgs?: unknown[];
  libraries?: LibraryAddresses;
  contract?: string;
  force?: boolean;
  // TODO: M2
  // provider?: keyof VerificationProvidersConfig;
}

/**
 * Verifies a deployed smart contract on the specified block explorer (e.g.,
 * Etherscan).
 *
 * This function performs all required checks and attempts verification using
 * minimal and full compiler input, handling constructor arguments and linked
 * libraries as needed. On success, returns `true`. On failure, throws a
 * HardhatError.
 *
 * @param {VerifyContractArgs} verifyContractArgs - Arguments for contract
 * verification, including address, constructor arguments, libraries, contract
 * FQN, and force flag.
 * @param {HardhatRuntimeEnvironment} hre - The Hardhat Runtime Environment.
 * @returns {Promise<boolean>} Resolves to `true` if the contract was
 * successfully verified, or was already verified.
 * @throws {HardhatError} On failure, throws a HardhatError.
 *
 * @example
 * import { verifyContract } from "hardhat-verify/verify";
 *
 * await verifyContract(
 *   {
 *     address: "0x...",
 *     constructorArgs: [/* ... *\/],
 *     libraries: { MyLibrary: "0x..." },
 *     contract: "contracts/MyContract.sol:MyContract",
 *   },
 *   hre
 * );
 */
export async function verifyContract(
  verifyContractArgs: VerifyContractArgs,
  hre: HardhatRuntimeEnvironment,
): Promise<boolean> {
  const {
    artifacts,
    config,
    globalOptions: { buildProfile: buildProfileName = "production" },
    network,
    solidity,
  } = hre;
  if (config.verify.etherscan.enabled === false) {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.ETHERSCAN_VERIFICATION_DISABLED_IN_CONFIG,
    );
  }

  validateArgs(verifyContractArgs);

  const {
    address,
    constructorArgs = [],
    libraries = {},
    contract,
    force = false,
    // TODO: M2
    // provider
  } = verifyContractArgs;

  const buildProfile = config.solidity.profiles[buildProfileName];
  // The "production" build profile is always present by default.
  // This check only fails if the user specifies a non-existent build profile name.
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
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.ETHERSCAN_BLOCK_EXPLORER_NOT_CONFIGURED,
      {
        chainId,
      },
    );
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
    console.log(`
The contract at ${address} has already been verified on ${etherscan.name}.

If you need to verify a partially verified contract, please use the --force flag.

Explorer: ${etherscan.getContractUrl(address)}
`);
    return true;
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

  const encodedConstructorArgs = await encodeConstructorArgs(
    contractInformation.compilerOutputContract.abi,
    constructorArgs,
    contractInformation.contract,
  );

  const minimalCompilerInput = await getCompilerInput(
    solidity,
    config.paths.root,
    contractInformation.sourceName,
    buildProfileName,
  );

  const { success: minimalInputVerificationSuccess } =
    await attemptVerification({
      verificationProvider: etherscan,
      address,
      encodedConstructorArgs,
      contractInformation: {
        ...contractInformation,
        // Use the minimal compiler input for the first verification attempt
        compilerInput: {
          ...minimalCompilerInput,
          settings: {
            ...minimalCompilerInput.settings,
            // Ensure the libraries are included in the compiler input
            libraries: libraryInformation.libraries,
          },
        },
      },
    });

  if (minimalInputVerificationSuccess) {
    console.log(`
🎉 Contract verified successfully on ${etherscan.name}!

  ${contractInformation.contract}
  Explorer: ${etherscan.getContractUrl(address)}
`);
    return true;
  }

  console.log(`
The initial verification attempt for ${contractInformation.contract} failed using the minimal compiler input.

Trying again with the full solc input used to compile and deploy the contract.
Unrelated contracts may be displayed on ${etherscan.name} as a result.
`);

  // If verifying with the minimal input failed, try again with the full compiler input
  const {
    success: fullCompilerInputVerificationSuccess,
    message: verificationMessage,
  } = await attemptVerification({
    verificationProvider: etherscan,
    address,
    encodedConstructorArgs,
    contractInformation: {
      ...contractInformation,
      compilerInput: {
        ...contractInformation.compilerInput,
        settings: {
          ...contractInformation.compilerInput.settings,
          // Ensure the libraries are included in the compiler input
          libraries: libraryInformation.libraries,
        },
      },
    },
  });

  if (fullCompilerInputVerificationSuccess) {
    console.log(`
🎉 Contract verified successfully on ${etherscan.name}!

  ${contractInformation.contract}
  Explorer: ${etherscan.getContractUrl(address)}
`);
    return true;
  }

  const librariesWarning =
    libraryInformation.undetectableLibraries.length > 0
      ? `
This contract makes use of libraries whose addresses are undetectable by the plugin.
Keep in mind that this verification failure may be due to passing in the wrong
address for one of these libraries:
${libraryInformation.undetectableLibraries.map((x) => `  * ${x}`).join("\n")}`
      : "";

  throw new HardhatError(
    HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONTRACT_VERIFICATION_FAILED,
    {
      reason: verificationMessage,
      librariesWarning,
    },
  );
}

function validateArgs({ address, contract }: VerifyContractArgs): void {
  if (!isAddress(address)) {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_VERIFY.VALIDATION.INVALID_ADDRESS,
      {
        value: address,
      },
    );
  }

  // TODO: we could use a more sophisticated validation here, like
  // in #getFullyQualifiedName within the artifacts manager.
  // This would allow us to skip the validation in the
  // resolveContractInformation function.
  if (contract !== undefined && !isFullyQualifiedName(contract)) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.GENERAL.INVALID_FULLY_QUALIFIED_NAME,
      {
        name: contract,
      },
    );
  }
}

async function attemptVerification({
  verificationProvider,
  address,
  encodedConstructorArgs,
  contractInformation,
}: {
  verificationProvider: Etherscan;
  address: string;
  encodedConstructorArgs: string;
  contractInformation: ContractInformation;
}): Promise<{
  success: boolean;
  message: string;
}> {
  const guid = await verificationProvider.verify(
    address,
    JSON.stringify(contractInformation.compilerInput),
    contractInformation.contract,
    `v${contractInformation.solcLongVersion}`,
    encodedConstructorArgs,
  );

  console.log(`
✅ Submitted source code for verification on ${verificationProvider.name}:

  ${contractInformation.contract}
  Address: ${address}

⏳ Waiting for verification result...
`);

  await sleep(0.5); // Wait half a second before polling

  const verificationStatus = await verificationProvider.pollVerificationStatus(
    guid,
    address,
    contractInformation.contract,
  );

  return {
    success: verificationStatus.isSuccess(),
    message: verificationStatus.message,
  };
}
