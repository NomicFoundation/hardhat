import { ethers } from "ethers";
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
    | (ethers.Signer | FactoryOptions)
    | (ethers.utils.BytesLike | string),
  signer?: ethers.Signer
) {
  if (typeof nameOrAbi === "string") {
    const contractFactory = await getContractFactoryByName(
      hre,
      nameOrAbi,
      bytecodeOrFactoryOptions as ethers.Signer | FactoryOptions | undefined
    );

    if (contractFactory.bytecode === "0x") {
      throw new NomicLabsHardhatPluginError(
        "hardhat-ethers",
        `The requested contract, ${nameOrAbi}, is an abstract contract.
Contract factories need non-abstract contracts to work.`
      );
    }

    return contractFactory;
  }

  return getContractFactoryByAbiAndBytecode(
    hre,
    nameOrAbi,
    bytecodeOrFactoryOptions as ethers.utils.BytesLike | string,
    signer
  );
}

function isFactoryOptions(
  signerOrOptions?: ethers.Signer | FactoryOptions
): signerOrOptions is FactoryOptions {
  if (
    signerOrOptions === undefined ||
    signerOrOptions instanceof ethers.Signer
  ) {
    return false;
  }

  return true;
}

async function getContractFactoryByName(
  hre: HardhatRuntimeEnvironment,
  contractName: string,
  signerOrOptions?: ethers.Signer | FactoryOptions
) {
  const artifact = await hre.artifacts.readArtifact(contractName);

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

  let signer: ethers.Signer | undefined;
  let libraryLinks: LibraryLinks = {};
  if (isFactoryOptions(signerOrOptions)) {
    signer = signerOrOptions.signer;
    libraryLinks = signerOrOptions.libraryLinks ?? {};
  } else {
    signer = signerOrOptions;
  }

  const linksToApply: Map<string, Link> = new Map();
  for (const [linkedLibraryName, linkedLibraryAddress] of Object.entries(
    libraryLinks
  )) {
    if (!ethers.utils.isAddress(linkedLibraryAddress)) {
      throw new NomicLabsHardhatPluginError(
        "hardhat-ethers",
        `The library name ${linkedLibraryName} has an invalid address: ${linkedLibraryAddress}.`
      );
    }

    const matchingNeededLibraries = neededLibraries.filter((neededLibrary) => {
      return (
        neededLibrary.libName === linkedLibraryName ||
        `${neededLibrary.sourceName}:${neededLibrary.libName}` ===
          linkedLibraryName
      );
    });

    if (matchingNeededLibraries.length > 1) {
      const matchingNeededLibrariesFQNs = matchingNeededLibraries.map(
        ({ sourceName, libName }) => `${sourceName}:${libName}`
      );
      throw new NomicLabsHardhatPluginError(
        "hardhat-ethers",
        `The library name ${linkedLibraryName} is ambiguous for the contract ${contractName}.
It may resolve to one of the following libraries:
${matchingNeededLibrariesFQNs.join("\n")}

To fix this, choose one of these fully qualified library names and replace where appropriate.`
      );
    }

    if (matchingNeededLibraries.length === 1) {
      const [neededLibrary] = matchingNeededLibraries;

      const neededLibraryFQN = `${neededLibrary.sourceName}:${neededLibrary.libName}`;

      if (linksToApply.has(neededLibraryFQN)) {
        throw new NomicLabsHardhatPluginError(
          "hardhat-ethers",
          `The library names ${linkedLibraryName} and ${neededLibraryFQN} refer to the same library and were given as two separate library links.
Remove one of them and review your library links before proceeding.`
        );
      }

      linksToApply.set(neededLibraryFQN, {
        sourceName: neededLibrary.sourceName,
        libraryName: neededLibrary.libName,
        address: linkedLibraryAddress,
      });
    }
  }

  // TODO-HH: what happens if linksToApply.size > neededLibraries.length? warning, throw, nothing?
  if (linksToApply.size < neededLibraries.length) {
    const missingLibrariesFQNs = neededLibraries
      .map((lib) => `${lib.sourceName}:${lib.libName}`)
      .filter((libFQName) => !linksToApply.has(libFQName));

    const missingLibraries = missingLibrariesFQNs
      .map((x) => `* ${x}`)
      .join("\n");

    throw new NomicLabsHardhatPluginError(
      "hardhat-ethers",
      `The contract ${contractName} is missing links for the following libraries:

${missingLibraries}`
    );
  }

  const linkedBytecode = linkBytecode(artifact, [...linksToApply.values()]);

  return getContractFactoryByAbiAndBytecode(
    hre,
    artifact.abi,
    linkedBytecode,
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

  return new ethers.ContractFactory(abiWithAddedGas, bytecode, signer);
}

export async function getContractAt(
  hre: HardhatRuntimeEnvironment,
  nameOrAbi: string | any[],
  address: string,
  signer?: ethers.Signer
) {
  if (typeof nameOrAbi === "string") {
    const factory = await getContractFactoryByName(hre, nameOrAbi, signer);
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

  return new ethers.Contract(address, abiWithAddedGas, signer);
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
