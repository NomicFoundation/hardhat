import type { ethers } from "ethers";
import type { SignerWithAddress } from "../signers";
import type { FactoryOptions, Libraries } from "../types";

import { NomicLabsHardhatPluginError } from "hardhat/plugins";
import {
  Artifact,
  HardhatRuntimeEnvironment,
  NetworkConfig,
} from "hardhat/types";

interface Link {
  sourceName: string;
  libraryName: string;
  address: string;
}

const pluginName = "hardhat-ethers";

function isArtifact(artifact: any): artifact is Artifact {
  const {
    contractName,
    sourceName,
    abi,
    bytecode,
    deployedBytecode,
    linkReferences,
    deployedLinkReferences,
  } = artifact;

  return (
    typeof contractName === "string" &&
    typeof sourceName === "string" &&
    Array.isArray(abi) &&
    typeof bytecode === "string" &&
    typeof deployedBytecode === "string" &&
    linkReferences !== undefined &&
    deployedLinkReferences !== undefined
  );
}

export async function getSigners(
  hre: HardhatRuntimeEnvironment
): Promise<SignerWithAddress[]> {
  const accounts = await hre.ethers.provider.listAccounts();

  const signersWithAddress = await Promise.all(
    accounts.map((account) => getSigner(hre, account))
  );

  return signersWithAddress;
}

export async function getSigner(
  hre: HardhatRuntimeEnvironment,
  address: string
): Promise<SignerWithAddress> {
  const { SignerWithAddress: SignerWithAddressImpl } = await import(
    "../signers"
  );

  const signer = hre.ethers.provider.getSigner(address);

  const signerWithAddress = await SignerWithAddressImpl.create(signer);

  return signerWithAddress;
}

export async function getImpersonatedSigner(
  hre: HardhatRuntimeEnvironment,
  address: string
): Promise<SignerWithAddress> {
  await hre.ethers.provider.send("hardhat_impersonateAccount", [address]);
  return getSigner(hre, address);
}

export function getContractFactory(
  hre: HardhatRuntimeEnvironment,
  name: string,
  signerOrOptions?: ethers.Signer | FactoryOptions
): Promise<ethers.ContractFactory>;

export function getContractFactory(
  hre: HardhatRuntimeEnvironment,
  abi: any[],
  bytecode: ethers.utils.BytesLike,
  signer?: ethers.Signer
): Promise<ethers.ContractFactory>;

export async function getContractFactory(
  hre: HardhatRuntimeEnvironment,
  nameOrAbi: string | any[],
  bytecodeOrFactoryOptions?:
    | (ethers.Signer | FactoryOptions)
    | ethers.utils.BytesLike,
  signer?: ethers.Signer
) {
  if (typeof nameOrAbi === "string") {
    const artifact = await hre.artifacts.readArtifact(nameOrAbi);

    return getContractFactoryFromArtifact(
      hre,
      artifact,
      bytecodeOrFactoryOptions as ethers.Signer | FactoryOptions | undefined
    );
  }

  return getContractFactoryByAbiAndBytecode(
    hre,
    nameOrAbi,
    bytecodeOrFactoryOptions as ethers.utils.BytesLike,
    signer
  );
}

function isFactoryOptions(
  signerOrOptions?: ethers.Signer | FactoryOptions
): signerOrOptions is FactoryOptions {
  const { Signer } = require("ethers") as typeof ethers;
  if (signerOrOptions === undefined || signerOrOptions instanceof Signer) {
    return false;
  }

  return true;
}

export async function getContractFactoryFromArtifact(
  hre: HardhatRuntimeEnvironment,
  artifact: Artifact,
  signerOrOptions?: ethers.Signer | FactoryOptions
) {
  let libraries: Libraries = {};
  let signer: ethers.Signer | undefined;

  if (!isArtifact(artifact)) {
    throw new NomicLabsHardhatPluginError(
      pluginName,
      `You are trying to create a contract factory from an artifact, but you have not passed a valid artifact parameter.`
    );
  }

  if (isFactoryOptions(signerOrOptions)) {
    signer = signerOrOptions.signer;
    libraries = signerOrOptions.libraries ?? {};
  } else {
    signer = signerOrOptions;
  }

  if (artifact.bytecode === "0x") {
    throw new NomicLabsHardhatPluginError(
      pluginName,
      `You are trying to create a contract factory for the contract ${artifact.contractName}, which is abstract and can't be deployed.
If you want to call a contract using ${artifact.contractName} as its interface use the "getContractAt" function instead.`
    );
  }

  const linkedBytecode = await collectLibrariesAndLink(artifact, libraries);

  return getContractFactoryByAbiAndBytecode(
    hre,
    artifact.abi,
    linkedBytecode,
    signer
  );
}

async function collectLibrariesAndLink(
  artifact: Artifact,
  libraries: Libraries
) {
  const { utils } = require("ethers") as typeof ethers;

  const neededLibraries: Array<{
    sourceName: string;
    libName: string;
  }> = [];
  for (const [sourceName, sourceLibraries] of Object.entries(
    artifact.linkReferences
  )) {
    for (const libName of Object.keys(sourceLibraries)) {
      neededLibraries.push({ sourceName, libName });
    }
  }

  const linksToApply: Map<string, Link> = new Map();
  for (const [linkedLibraryName, linkedLibraryAddress] of Object.entries(
    libraries
  )) {
    if (!utils.isAddress(linkedLibraryAddress)) {
      throw new NomicLabsHardhatPluginError(
        pluginName,
        `You tried to link the contract ${artifact.contractName} with the library ${linkedLibraryName}, but provided this invalid address: ${linkedLibraryAddress}`
      );
    }

    const matchingNeededLibraries = neededLibraries.filter((lib) => {
      return (
        lib.libName === linkedLibraryName ||
        `${lib.sourceName}:${lib.libName}` === linkedLibraryName
      );
    });

    if (matchingNeededLibraries.length === 0) {
      let detailedMessage: string;
      if (neededLibraries.length > 0) {
        const libraryFQNames = neededLibraries
          .map((lib) => `${lib.sourceName}:${lib.libName}`)
          .map((x) => `* ${x}`)
          .join("\n");
        detailedMessage = `The libraries needed are:
${libraryFQNames}`;
      } else {
        detailedMessage = "This contract doesn't need linking any libraries.";
      }
      throw new NomicLabsHardhatPluginError(
        pluginName,
        `You tried to link the contract ${artifact.contractName} with ${linkedLibraryName}, which is not one of its libraries.
${detailedMessage}`
      );
    }

    if (matchingNeededLibraries.length > 1) {
      const matchingNeededLibrariesFQNs = matchingNeededLibraries
        .map(({ sourceName, libName }) => `${sourceName}:${libName}`)
        .map((x) => `* ${x}`)
        .join("\n");
      throw new NomicLabsHardhatPluginError(
        pluginName,
        `The library name ${linkedLibraryName} is ambiguous for the contract ${artifact.contractName}.
It may resolve to one of the following libraries:
${matchingNeededLibrariesFQNs}

To fix this, choose one of these fully qualified library names and replace where appropriate.`
      );
    }

    const [neededLibrary] = matchingNeededLibraries;

    const neededLibraryFQN = `${neededLibrary.sourceName}:${neededLibrary.libName}`;

    // The only way for this library to be already mapped is
    // for it to be given twice in the libraries user input:
    // once as a library name and another as a fully qualified library name.
    if (linksToApply.has(neededLibraryFQN)) {
      throw new NomicLabsHardhatPluginError(
        pluginName,
        `The library names ${neededLibrary.libName} and ${neededLibraryFQN} refer to the same library and were given as two separate library links.
Remove one of them and review your library links before proceeding.`
      );
    }

    linksToApply.set(neededLibraryFQN, {
      sourceName: neededLibrary.sourceName,
      libraryName: neededLibrary.libName,
      address: linkedLibraryAddress,
    });
  }

  if (linksToApply.size < neededLibraries.length) {
    const missingLibraries = neededLibraries
      .map((lib) => `${lib.sourceName}:${lib.libName}`)
      .filter((libFQName) => !linksToApply.has(libFQName))
      .map((x) => `* ${x}`)
      .join("\n");

    throw new NomicLabsHardhatPluginError(
      pluginName,
      `The contract ${artifact.contractName} is missing links for the following libraries:
${missingLibraries}

Learn more about linking contracts at https://hardhat.org/hardhat-runner/plugins/nomiclabs-hardhat-ethers#library-linking
`
    );
  }

  return linkBytecode(artifact, [...linksToApply.values()]);
}

async function getContractFactoryByAbiAndBytecode(
  hre: HardhatRuntimeEnvironment,
  abi: any[],
  bytecode: ethers.utils.BytesLike,
  signer?: ethers.Signer
) {
  const { ContractFactory } = require("ethers") as typeof ethers;

  if (signer === undefined) {
    const signers = await hre.ethers.getSigners();
    signer = signers[0];
  }

  const abiWithAddedGas = addGasToAbiMethodsIfNecessary(
    hre.network.config,
    abi
  );

  return new ContractFactory(abiWithAddedGas, bytecode, signer);
}

export async function getContractAt(
  hre: HardhatRuntimeEnvironment,
  nameOrAbi: string | any[],
  address: string,
  signer?: ethers.Signer
) {
  if (typeof nameOrAbi === "string") {
    const artifact = await hre.artifacts.readArtifact(nameOrAbi);

    return getContractAtFromArtifact(hre, artifact, address, signer);
  }

  const { Contract } = require("ethers") as typeof ethers;

  if (signer === undefined) {
    const signers = await hre.ethers.getSigners();
    signer = signers[0];
  }

  // If there's no signer, we want to put the provider for the selected network here.
  // This allows read only operations on the contract interface.
  const signerOrProvider: ethers.Signer | ethers.providers.Provider =
    signer !== undefined ? signer : hre.ethers.provider;

  const abiWithAddedGas = addGasToAbiMethodsIfNecessary(
    hre.network.config,
    nameOrAbi
  );

  return new Contract(address, abiWithAddedGas, signerOrProvider);
}

export async function getContractAtFromArtifact(
  hre: HardhatRuntimeEnvironment,
  artifact: Artifact,
  address: string,
  signer?: ethers.Signer
) {
  if (!isArtifact(artifact)) {
    throw new NomicLabsHardhatPluginError(
      pluginName,
      `You are trying to create a contract by artifact, but you have not passed a valid artifact parameter.`
    );
  }

  const factory = await getContractFactoryByAbiAndBytecode(
    hre,
    artifact.abi,
    "0x",
    signer
  );

  let contract = factory.attach(address);
  // If there's no signer, we connect the contract instance to the provider for the selected network.
  if (contract.provider === null) {
    contract = contract.connect(hre.ethers.provider);
  }

  return contract;
}

// This helper adds a `gas` field to the ABI function elements if the network
// is set up to use a fixed amount of gas.
// This is done so that ethers doesn't automatically estimate gas limits on
// every call.
function addGasToAbiMethodsIfNecessary(
  networkConfig: NetworkConfig,
  abi: any[]
): any[] {
  const { BigNumber } = require("ethers") as typeof ethers;

  if (networkConfig.gas === "auto" || networkConfig.gas === undefined) {
    return abi;
  }

  // ethers adds 21000 to whatever the abi `gas` field has. This may lead to
  // OOG errors, as people may set the default gas to the same value as the
  // block gas limit, especially on Hardhat Network.
  // To avoid this, we substract 21000.
  // HOTFIX: We substract 1M for now. See: https://github.com/ethers-io/ethers.js/issues/1058#issuecomment-703175279
  const gasLimit = BigNumber.from(networkConfig.gas).sub(1000000).toHexString();

  const modifiedAbi: any[] = [];

  for (const abiElement of abi) {
    if (abiElement.type !== "function") {
      modifiedAbi.push(abiElement);
      continue;
    }

    modifiedAbi.push({
      ...abiElement,
      gas: gasLimit,
    });
  }

  return modifiedAbi;
}

function linkBytecode(artifact: Artifact, libraries: Link[]): string {
  let bytecode = artifact.bytecode;

  // TODO: measure performance impact
  for (const { sourceName, libraryName, address } of libraries) {
    const linkReferences = artifact.linkReferences[sourceName][libraryName];
    for (const { start, length } of linkReferences) {
      bytecode =
        bytecode.substr(0, 2 + start * 2) +
        address.substr(2) +
        bytecode.substr(2 + (start + length) * 2);
    }
  }

  return bytecode;
}
