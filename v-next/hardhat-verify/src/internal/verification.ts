import type { ContractInformation } from "./contract.js";
import type { LibraryAddresses } from "./libraries.js";
import type { VerificationProvider } from "./types.js";
import type { Dispatcher } from "@nomicfoundation/hardhat-utils/request";
import type {
  BlockExplorerBlockscoutConfig,
  ChainDescriptorsConfig,
  VerificationProvidersConfig,
} from "hardhat/types/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import type { EthereumProvider } from "hardhat/types/providers";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { isAddress } from "@nomicfoundation/hardhat-utils/eth";
import { sleep } from "@nomicfoundation/hardhat-utils/lang";
import { capitalize } from "@nomicfoundation/hardhat-utils/string";
import { isFullyQualifiedName } from "hardhat/utils/contract-names";

import { getCompilerInput } from "./artifacts.js";
import { Blockscout, BLOCKSCOUT_PROVIDER_NAME } from "./blockscout.js";
import { Bytecode } from "./bytecode.js";
import { getChainDescriptor, getChainId } from "./chains.js";
import { encodeConstructorArgs } from "./constructor-args.js";
import { ContractInformationResolver } from "./contract.js";
import { Etherscan, ETHERSCAN_PROVIDER_NAME } from "./etherscan.js";
import { resolveLibraryInformation } from "./libraries.js";
import {
  filterVersionsByRange,
  resolveSupportedSolcVersions,
} from "./solc-versions.js";
import { Sourcify, SOURCIFY_PROVIDER_NAME } from "./sourcify.js";

export interface VerifyContractArgs {
  address: string;
  constructorArgs?: unknown[];
  libraries?: LibraryAddresses;
  /** The fully qualified name of the contract, in the format: `<source-name>:<contract-name>` */
  contract?: string;
  force?: boolean;
  provider?: keyof VerificationProvidersConfig;
  /** The hash of the contract creation transaction (optional, used by Sourcify) */
  creationTxHash?: string;
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
  consoleLog: (text: string) => void = console.log,
  dispatcher?: Dispatcher,
  provider?: EthereumProvider,
): Promise<boolean> {
  const {
    artifacts,
    config,
    globalOptions: { buildProfile: buildProfileName = "production" },
    network,
    solidity,
  } = hre;
  const { provider: verificationProviderName = ETHERSCAN_PROVIDER_NAME } =
    verifyContractArgs;
  validateVerificationProviderName(verificationProviderName);

  validateArgs(verifyContractArgs);

  const {
    address,
    constructorArgs = [],
    libraries = {},
    contract,
    force = false,
    creationTxHash,
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

  const connection = await network.connect();
  const { networkName } = connection;
  const resolvedProvider = provider ?? connection.provider;

  const instance = await createVerificationProviderInstance({
    provider: resolvedProvider,
    networkName,
    chainDescriptors: config.chainDescriptors,
    verificationProviderName,
    verificationProvidersConfig: config.verify,
    dispatcher,
  });

  let isVerified = false;
  try {
    isVerified = await instance.isVerified(address);
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
    consoleLog(`
The contract at ${address} has already been verified on ${instance.name}.

If you need to verify a partially verified contract, please use the --force flag.

Explorer: ${instance.getContractUrl(address)}`);
    return true;
  }

  const supportedSolcVersions =
    await resolveSupportedSolcVersions(buildProfile);

  const deployedBytecode = await Bytecode.getDeployedContractBytecode(
    resolvedProvider,
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

  let encodedConstructorArgs: string | undefined;
  // Don't throw on Sourcify if no constructor args are provided
  if (verificationProviderName !== SOURCIFY_PROVIDER_NAME) {
    encodedConstructorArgs = await encodeConstructorArgs(
      contractInformation.compilerOutputContract.abi,
      constructorArgs,
      contractInformation.userFqn,
    );
  }

  const minimalCompilerInput = await getCompilerInput(
    solidity,
    config.paths.root,
    contractInformation.sourceName,
    contractInformation.inputFqn.startsWith("npm/"),
    buildProfileName,
  );

  const { success: minimalInputVerificationSuccess } =
    await attemptVerification(
      {
        verificationProvider: instance,
        address,
        encodedConstructorArgs,
        creationTxHash,
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
      },
      consoleLog,
    );

  if (minimalInputVerificationSuccess) {
    consoleLog(`
✅ Contract verified successfully on ${instance.name}!

  ${contractInformation.userFqn}
  Explorer: ${instance.getContractUrl(address)}`);
    return true;
  }

  consoleLog(`
The initial verification attempt for ${contractInformation.userFqn} failed using the minimal compiler input.

Trying again with the full solc input used to compile and deploy the contract.
Unrelated contracts may be displayed on ${instance.name} as a result.
`);

  // If verifying with the minimal input failed, try again with the full compiler input
  const {
    success: fullCompilerInputVerificationSuccess,
    message: verificationMessage,
  } = await attemptVerification(
    {
      verificationProvider: instance,
      address,
      encodedConstructorArgs,
      creationTxHash,
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
    },
    consoleLog,
  );

  if (fullCompilerInputVerificationSuccess) {
    consoleLog(`
✅ Contract verified successfully on ${instance.name}!

  ${contractInformation.userFqn}
  Explorer: ${instance.getContractUrl(address)}`);
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

export function validateVerificationProviderName(provider: unknown): void {
  if (
    provider !== ETHERSCAN_PROVIDER_NAME &&
    provider !== BLOCKSCOUT_PROVIDER_NAME &&
    provider !== SOURCIFY_PROVIDER_NAME
  ) {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_VERIFY.VALIDATION.INVALID_VERIFICATION_PROVIDER,
      {
        verificationProvider: String(provider),
        supportedVerificationProviders: [
          ETHERSCAN_PROVIDER_NAME,
          BLOCKSCOUT_PROVIDER_NAME,
          SOURCIFY_PROVIDER_NAME,
        ].join(", "),
      },
    );
  }
}

export function validateArgs({ address, contract }: VerifyContractArgs): void {
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

async function createVerificationProviderInstance({
  provider,
  networkName,
  chainDescriptors,
  verificationProviderName,
  verificationProvidersConfig,
  dispatcher,
}: {
  provider: EthereumProvider;
  networkName: string;
  chainDescriptors: ChainDescriptorsConfig;
  verificationProviderName: keyof VerificationProvidersConfig;
  verificationProvidersConfig: VerificationProvidersConfig;
  dispatcher?: Dispatcher;
}): Promise<VerificationProvider> {
  const chainId = await getChainId(provider);
  if (verificationProviderName === "sourcify") {
    return new Sourcify({
      chainId,
      apiUrl: verificationProvidersConfig.sourcify.apiUrl,
      dispatcher,
    });
  }

  const chainDescriptor = await getChainDescriptor(
    chainId,
    chainDescriptors,
    networkName,
  );

  if (chainDescriptor.blockExplorers[verificationProviderName] === undefined) {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.BLOCK_EXPLORER_NOT_CONFIGURED,
      {
        verificationProvider: capitalize(verificationProviderName),
        chainId,
      },
    );
  }

  const commonOptions = {
    ...chainDescriptor.blockExplorers[verificationProviderName],
    dispatcher,
  };

  if (verificationProviderName === "etherscan") {
    return new Etherscan({
      ...commonOptions,
      chainId,
      apiKey: await verificationProvidersConfig.etherscan.apiKey.get(),
    });
  }

  return new Blockscout(
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    -- At this point we know commonOptions is of type BlockscoutConfig */
    commonOptions as BlockExplorerBlockscoutConfig & { dispatcher: Dispatcher },
  );
}

async function attemptVerification(
  {
    verificationProvider,
    address,
    encodedConstructorArgs,
    contractInformation,
    creationTxHash,
  }: {
    verificationProvider: VerificationProvider;
    address: string;
    encodedConstructorArgs?: string;
    contractInformation: ContractInformation;
    creationTxHash?: string;
  },
  consoleLog: (text: string) => void = console.log,
): Promise<{
  success: boolean;
  message: string;
}> {
  const guid = await verificationProvider.verify(
    address,
    contractInformation.compilerInput,
    contractInformation.inputFqn,
    `v${contractInformation.solcLongVersion}`,
    encodedConstructorArgs,
    creationTxHash,
  );

  consoleLog(`
📤 Submitted source code for verification on ${verificationProvider.name}:

  ${contractInformation.userFqn}
  Address: ${address}

⏳ Waiting for verification result...
`);

  await sleep(0.5); // Wait half a second before polling

  const verificationStatus = await verificationProvider.pollVerificationStatus(
    guid,
    address,
    contractInformation.userFqn,
  );

  return verificationStatus;
}
