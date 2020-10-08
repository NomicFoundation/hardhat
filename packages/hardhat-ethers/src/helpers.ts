import { ethers } from "ethers";
import { NomicLabsHardhatPluginError } from "hardhat/plugins";
import {
  Artifact,
  HardhatRuntimeEnvironment,
  LinkReferences,
  NetworkConfig,
} from "hardhat/types";

interface Link {
  sourceName: string;
  libraryName: string;
  address: string;
}

export interface LibraryLinks {
  [libraryName: string]: string;
}

export interface FactoryOptions {
  signer?: ethers.Signer;
  libraryLinks?: LibraryLinks;
}

export async function getSigners(hre: HardhatRuntimeEnvironment) {
  const accounts = await hre.ethers.provider.listAccounts();
  return accounts.map((account: string) =>
    hre.ethers.provider.getSigner(account)
  );
}

export function getContractFactory(
  hre: HardhatRuntimeEnvironment,
  name: string,
  signerOrOptions?: ethers.Signer | FactoryOptions
): Promise<ethers.ContractFactory>;

export function getContractFactory(
  hre: HardhatRuntimeEnvironment,
  abi: any[],
  bytecode: ethers.utils.BytesLike | string,
  signer?: ethers.Signer
): Promise<ethers.ContractFactory>;

export async function getContractFactory(
  hre: HardhatRuntimeEnvironment,
  nameOrAbi: string | any[],
  bytecodeOrFactoryOptions?:
    | ethers.Signer
    | FactoryOptions
    | ethers.utils.BytesLike
    | string,
  signerOrLibraryLinks?: ethers.Signer
) {
  if (typeof nameOrAbi === "string") {
    return getContractFactoryByName(
      hre,
      nameOrAbi,
      bytecodeOrFactoryOptions as ethers.Signer | FactoryOptions | undefined
    );
  }

  return getContractFactoryByAbiAndBytecode(
    hre,
    nameOrAbi,
    bytecodeOrFactoryOptions as ethers.utils.BytesLike | string,
    signerOrLibraryLinks as ethers.Signer
  );
}

export async function getContractFactoryByName(
  hre: HardhatRuntimeEnvironment,
  name: string,
  signerOrOptions?: ethers.Signer | FactoryOptions
) {
  return internalGetContractFactoryByName(hre, name, true, signerOrOptions);
}

function isFactoryOptions(argument: any): argument is FactoryOptions {
  return (
    typeof argument === "object" &&
    !(argument instanceof ethers.Signer) &&
    (!("signer" in argument) || argument.signer instanceof ethers.Signer) &&
    (!("libraryLinks" in argument) || typeof argument.libraryLinks === "object")
  );
}

async function internalGetContractFactoryByName(
  hre: HardhatRuntimeEnvironment,
  name: string,
  shouldThrowOnAbstract: boolean,
  signerOrOptions?: ethers.Signer | FactoryOptions
) {
  const artifact = await hre.artifacts.readArtifact(name);
  let { bytecode } = artifact;
  if (shouldThrowOnAbstract && bytecode === "0x") {
    throw new NomicLabsHardhatPluginError(
      "hardhat-ethers",
      `The requested contract, ${name}, is an abstract contract.
Contract factories need non-abstract contracts to work.`
    );
  }

  let signer;
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
  if (!isFactoryOptions(signerOrOptions)) {
    if (neededLibraries.length > 0) {
      const missingLibraries = neededLibraries.map(
        (lib) => `${lib.sourceName}:${lib.libName}`
      );
      throw new NomicLabsHardhatPluginError(
        "hardhat-ethers",
        `The contract ${name} is missing links for the following libraries: ${missingLibraries.join(
          ", "
        )}`
      );
    }
    signer = signerOrOptions;
  } else {
    signer = signerOrOptions.signer;
    if (
      signerOrOptions.libraryLinks !== undefined &&
      neededLibraries.length > 0
    ) {
      const links: Map<string, Link> = new Map();
      for (const [libraryName, address] of Object.entries(
        signerOrOptions.libraryLinks
      )) {
        const libCandidates = neededLibraries.filter((lib) => {
          return (
            lib.libName === libraryName ||
            `${lib.sourceName}:${lib.libName}` === libraryName
          );
        });
        if (libCandidates.length > 1) {
          const fullyQualifiedNames = libCandidates.map(
            ({ sourceName, libName }) => `${sourceName}:${libName}`
          );
          throw new NomicLabsHardhatPluginError(
            "hardhat-ethers",
            `The library name ${libraryName} is ambiguous for the contract ${name}.
It may resolve to one of the following libraries:
${fullyQualifiedNames.join("\n")}

To fix this, choose one of these fully qualified library names and replace where appropriate.`
          );
        }
        if (libCandidates.length === 1) {
          const [lib] = libCandidates;
          const fullyQualifiedName = `${lib.sourceName}:${lib.libName}`;
          if (links.has(fullyQualifiedName)) {
            throw new NomicLabsHardhatPluginError(
              "hardhat-ethers",
              `The library names ${libraryName} and ${fullyQualifiedName} refer to the same library and were given as two separate library links.
Remove one of them and review your library links before proceeding.`
            );
          }

          if (!hre.ethers.utils.isAddress(address)) {
            throw new NomicLabsHardhatPluginError(
              "hardhat-ethers",
              `The library name ${libraryName} has an invalid address: ${address}.`
            );
          }
          links.set(fullyQualifiedName, {
            sourceName: lib.sourceName,
            libraryName: lib.libName,
            address,
          });
        }
      }
      if (links.size < neededLibraries.length) {
        const missingLibraries = neededLibraries
          .map((lib) => `${lib.sourceName}:${lib.libName}`)
          .filter((libFQName) => !links.has(libFQName));
        throw new NomicLabsHardhatPluginError(
          "hardhat-ethers",
          `The contract ${name} is missing links for the following libraries: ${missingLibraries.join(
            ", "
          )}`
        );
      }
      bytecode = linkBytecode(artifact, [...links.values()]);
    }
  }
  return getContractFactoryByAbiAndBytecode(
    hre,
    artifact.abi,
    bytecode,
    signer
  );
}

export async function getContractFactoryByAbiAndBytecode(
  hre: HardhatRuntimeEnvironment,
  abi: any[],
  bytecode: ethers.utils.BytesLike | string,
  signer?: ethers.Signer
) {
  if (signer === undefined) {
    const signers = await hre.ethers.getSigners();
    signer = signers[0];
  }

  const abiWithAddedGas = addGasToAbiMethodsIfNecessary(
    hre.network.config,
    abi
  );

  return new hre.ethers.ContractFactory(abiWithAddedGas, bytecode, signer);
}

export async function getContractAt(
  hre: HardhatRuntimeEnvironment,
  nameOrAbi: string | any[],
  address: string,
  signer?: ethers.Signer
) {
  if (typeof nameOrAbi === "string") {
    const factory = await internalGetContractFactoryByName(
      hre,
      nameOrAbi,
      false,
      signer
    );
    return factory.attach(address);
  }

  if (signer === undefined) {
    const signers = await hre.ethers.getSigners();
    signer = signers[0];
  }

  const abiWithAddedGas = addGasToAbiMethodsIfNecessary(
    hre.network.config,
    nameOrAbi
  );

  return new hre.ethers.Contract(address, abiWithAddedGas, signer);
}

// This helper adds a `gas` field to the ABI function elements if the network
// is set up to use a fixed amount of gas.
// This is done so that ethers doesn't automatically estimate gas limits on
// every call.
function addGasToAbiMethodsIfNecessary(
  networkConfig: NetworkConfig,
  abi: any[]
): any[] {
  if (networkConfig.gas === "auto" || networkConfig.gas === undefined) {
    return abi;
  }

  // ethers adds 21000 to whatever the abi `gas` field has. This may lead to
  // OOG errors, as people may set the default gas to the same value as the
  // block gas limit, especially on Hardhat Network.
  // To avoid this, we substract 21000.
  const gasLimit = ethers.BigNumber.from(networkConfig.gas)
    .sub(21000)
    .toHexString();

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

function linkBytecode(artifact: Artifact, libraryLinks: Link[]): string {
  let bytecode = artifact.bytecode;

  // TODO: measure performance impact
  for (const { sourceName, libraryName, address } of libraryLinks) {
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
