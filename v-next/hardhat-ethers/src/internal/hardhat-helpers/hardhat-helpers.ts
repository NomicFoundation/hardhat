import type {
  DeployContractOptions,
  FactoryOptions,
  Libraries,
} from "../../types.js";
import type { HardhatEthersProvider } from "../hardhat-ethers-provider/hardhat-ethers-provider.js";
import type { HardhatEthersSigner } from "../signers/signers.js";
import type {
  Abi,
  Artifact,
  ArtifactManager,
} from "@ignored/hardhat-vnext/types/artifacts";
import type { NetworkConfig } from "@ignored/hardhat-vnext/types/config";
import type { ethers as EthersT } from "ethers";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@ignored/hardhat-vnext-errors";

interface Link {
  sourceName: string;
  libraryName: string;
  address: string;
}

export class HardhatHelpers {
  readonly #provider: HardhatEthersProvider;
  readonly #networkName: string;
  readonly #networkConfig: Readonly<NetworkConfig>;
  readonly #artifactManager: ArtifactManager;

  constructor(
    provider: HardhatEthersProvider,
    networkName: string,
    networkConfig: NetworkConfig,
    artifactManager: ArtifactManager,
  ) {
    this.#provider = provider;
    this.#networkName = networkName;
    this.#networkConfig = networkConfig;

    this.#artifactManager = artifactManager;
  }

  public async getSigners(): Promise<HardhatEthersSigner[]> {
    let accounts: string[];

    try {
      accounts = await this.#provider.send("eth_accounts", []);
    } catch (error) {
      if (
        error instanceof Error &&
        /the method has been deprecated: eth_accounts/.test(error.message)
      ) {
        return [];
      }

      throw error;
    }

    const signersWithAddress = await Promise.all(
      accounts.map((account) => this.getSigner(account)),
    );

    return signersWithAddress;
  }

  public async getSigner(address: string): Promise<HardhatEthersSigner> {
    const { HardhatEthersSigner: SignerWithAddressImpl } = await import(
      "../signers/signers.js"
    );

    const signerWithAddress = await SignerWithAddressImpl.create(
      this.#provider,
      this.#networkName,
      this.#networkConfig,
      address,
    );

    return signerWithAddress;
  }

  public getContractFactory<A extends any[] = any[], I = EthersT.Contract>(
    name: string,
    signerOrOptions?: EthersT.Signer | FactoryOptions,
  ): Promise<EthersT.ContractFactory<A, I>>;

  public getContractFactory<A extends any[] = any[], I = EthersT.Contract>(
    abi: any[] | Abi,
    bytecode: EthersT.BytesLike,
    signer?: EthersT.Signer,
  ): Promise<EthersT.ContractFactory<A, I>>;

  public async getContractFactory<
    A extends any[] = any[],
    I = EthersT.Contract,
  >(
    nameOrAbi: string | any[] | Abi,
    bytecodeOrFactoryOptions?:
      | (EthersT.Signer | FactoryOptions)
      | EthersT.BytesLike,
    signer?: EthersT.Signer,
  ): Promise<EthersT.ContractFactory<A, I>> {
    if (typeof nameOrAbi === "string") {
      const artifact = await this.#artifactManager.readArtifact(nameOrAbi);

      return this.getContractFactoryFromArtifact<A, I>(
        artifact,
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- bytecodeOrFactoryOptions overlaps with one of the following types
        bytecodeOrFactoryOptions as EthersT.Signer | FactoryOptions | undefined,
      );
    }

    assertHardhatInvariant(
      typeof bytecodeOrFactoryOptions === "string" ||
        bytecodeOrFactoryOptions instanceof Uint8Array,
      "bytecode should be a string",
    );

    return this.#getContractFactoryByAbiAndBytecode(
      nameOrAbi,
      bytecodeOrFactoryOptions,
      signer,
    );
  }

  public async getContractFactoryFromArtifact<
    A extends any[] = any[],
    I = EthersT.Contract,
  >(
    artifact: Artifact<Abi>,
    signerOrOptions?: EthersT.Signer | FactoryOptions,
  ): Promise<EthersT.ContractFactory<A, I>> {
    let libraries: Libraries = {};
    let signer: EthersT.Signer | undefined;

    if (!this.#isArtifact(artifact)) {
      throw new HardhatError(
        HardhatError.ERRORS.ETHERS.INVALID_ARTIFACT_FOR_FACTORY,
      );
    }

    if (this.#isFactoryOptions(signerOrOptions)) {
      signer = signerOrOptions.signer;
      libraries = signerOrOptions.libraries ?? {};
    } else {
      signer = signerOrOptions;
    }

    if (artifact.bytecode === "0x") {
      throw new HardhatError(
        HardhatError.ERRORS.ETHERS.INVALID_ABSTRACT_CONTRACT_FOR_FACTORY,
        { contractName: artifact.contractName },
      );
    }

    const linkedBytecode = await this.#collectLibrariesAndLink(
      artifact,
      libraries,
    );

    return this.#getContractFactoryByAbiAndBytecode(
      artifact.abi,
      linkedBytecode,
      signer,
    );
  }

  public async getContractAt(
    nameOrAbi: string | Abi,
    address: string | EthersT.Addressable,
    signer?: EthersT.Signer,
  ): Promise<EthersT.Contract> {
    if (typeof nameOrAbi === "string") {
      const artifact = await this.#artifactManager.readArtifact(nameOrAbi);

      return this.getContractAtFromArtifact(artifact, address, signer);
    }

    const ethers = await import("ethers");

    if (signer === undefined) {
      const signers = await this.getSigners();
      signer = signers[0];
    }

    // If there's no signer, we want to put the provider for the selected network here.
    // This allows read only operations on the contract interface.
    const signerOrProvider: EthersT.Signer | EthersT.Provider =
      signer !== undefined ? signer : this.#provider;

    let resolvedAddress;
    if (ethers.isAddressable(address)) {
      resolvedAddress = await address.getAddress();
    } else {
      resolvedAddress = address;
    }

    return new ethers.Contract(resolvedAddress, nameOrAbi, signerOrProvider);
  }

  public async getContractAtFromArtifact(
    artifact: Artifact,
    address: string | EthersT.Addressable,
    signer?: EthersT.Signer,
  ): Promise<EthersT.Contract> {
    const ethers = await import("ethers");

    if (!this.#isArtifact(artifact)) {
      throw new HardhatError(
        HardhatError.ERRORS.ETHERS.INVALID_ARTIFACT_FOR_FACTORY,
      );
    }

    if (signer === undefined) {
      const signers = await this.getSigners();
      signer = signers[0];
    }

    let resolvedAddress;
    if (ethers.isAddressable(address)) {
      resolvedAddress = await address.getAddress();
    } else {
      resolvedAddress = address;
    }

    let contract = new ethers.Contract(resolvedAddress, artifact.abi, signer);

    if (contract.runner === null) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- EthersT.Contract overlaps with EthersT.BaseContract
      contract = contract.connect(this.#provider) as EthersT.Contract;
    }

    return contract;
  }

  public async deployContract(
    name: string,
    args?: any[],
    signerOrOptions?: EthersT.Signer | DeployContractOptions,
  ): Promise<EthersT.Contract>;

  public async deployContract(
    name: string,
    signerOrOptions?: EthersT.Signer | DeployContractOptions,
  ): Promise<EthersT.Contract>;

  public async deployContract(
    name: string,
    argsOrSignerOrOptions?: any[] | EthersT.Signer | DeployContractOptions,
    signerOrOptions?: EthersT.Signer | DeployContractOptions,
  ): Promise<EthersT.Contract> {
    let args = [];
    if (Array.isArray(argsOrSignerOrOptions)) {
      args = argsOrSignerOrOptions;
    } else {
      signerOrOptions = argsOrSignerOrOptions;
    }

    let overrides: EthersT.Overrides = {};
    if (signerOrOptions !== undefined && !("getAddress" in signerOrOptions)) {
      const overridesAndFactoryOptions = { ...signerOrOptions };

      // we delete the factory options properties in case ethers
      // rejects unknown properties
      delete overridesAndFactoryOptions.signer;
      delete overridesAndFactoryOptions.libraries;

      overrides = overridesAndFactoryOptions;
    }

    const factory = await this.getContractFactory(name, signerOrOptions);
    return factory.deploy(...args, overrides);
  }

  public async getImpersonatedSigner(
    address: string,
  ): Promise<HardhatEthersSigner> {
    await this.#provider.send("hardhat_impersonateAccount", [address]);
    return this.getSigner(address);
  }

  #isArtifact(artifact: any): artifact is Artifact {
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

  #isFactoryOptions(
    signerOrOptions?: EthersT.Signer | FactoryOptions,
  ): signerOrOptions is FactoryOptions {
    if (signerOrOptions === undefined || "provider" in signerOrOptions) {
      return false;
    }

    return true;
  }

  async #collectLibrariesAndLink(artifact: Artifact, libraries: Libraries) {
    const ethers = await import("ethers");

    const neededLibraries: Array<{
      sourceName: string;
      libName: string;
    }> = [];
    for (const [sourceName, sourceLibraries] of Object.entries(
      artifact.linkReferences,
    )) {
      for (const libName of Object.keys(sourceLibraries)) {
        neededLibraries.push({ sourceName, libName });
      }
    }

    const linksToApply: Map<string, Link> = new Map();
    for (const [linkedLibraryName, linkedLibraryAddress] of Object.entries(
      libraries,
    )) {
      let resolvedAddress: string;
      if (ethers.isAddressable(linkedLibraryAddress)) {
        resolvedAddress = await linkedLibraryAddress.getAddress();
      } else {
        resolvedAddress = linkedLibraryAddress;
      }

      if (!ethers.isAddress(resolvedAddress)) {
        throw new HardhatError(
          HardhatError.ERRORS.ETHERS.INVALID_ADDRESS_TO_LINK_CONTRACT_TO_LIBRARY,
          {
            contractName: artifact.contractName,
            linkedLibraryName,
            resolvedAddress,
          },
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

        throw new HardhatError(
          HardhatError.ERRORS.ETHERS.LIBRARY_NOT_AMONG_CONTRACT_LIBRARIES,
          {
            contractName: artifact.contractName,
            linkedLibraryName,
            detailedMessage,
          },
        );
      }

      if (matchingNeededLibraries.length > 1) {
        const matchingNeededLibrariesFQNs = matchingNeededLibraries
          .map(({ sourceName, libName }) => `${sourceName}:${libName}`)
          .map((x) => `* ${x}`)
          .join("\n");

        throw new HardhatError(
          HardhatError.ERRORS.ETHERS.AMBIGUOUS_LIBRARY_NAME,
          {
            contractName: artifact.contractName,
            linkedLibraryName,
            matchingNeededLibrariesFQNs,
          },
        );
      }

      const [neededLibrary] = matchingNeededLibraries;

      const neededLibraryFQN = `${neededLibrary.sourceName}:${neededLibrary.libName}`;

      // The only way for this library to be already mapped is
      // for it to be given twice in the libraries user input:
      // once as a library name and another as a fully qualified library name.
      if (linksToApply.has(neededLibraryFQN)) {
        throw new HardhatError(
          HardhatError.ERRORS.ETHERS.REFERENCE_TO_SAME_LIBRARY,
          {
            linkedLibraryName1: neededLibrary.libName,
            linkedLibraryName2: neededLibraryFQN,
          },
        );
      }

      linksToApply.set(neededLibraryFQN, {
        sourceName: neededLibrary.sourceName,
        libraryName: neededLibrary.libName,
        address: resolvedAddress,
      });
    }

    if (linksToApply.size < neededLibraries.length) {
      const missingLibraries = neededLibraries
        .map((lib) => `${lib.sourceName}:${lib.libName}`)
        .filter((libFQName) => !linksToApply.has(libFQName))
        .map((x) => `* ${x}`)
        .join("\n");

      throw new HardhatError(
        HardhatError.ERRORS.ETHERS.MISSING_LINK_FOR_LIBRARY,
        {
          contractName: artifact.contractName,
          missingLibraries,
        },
      );
    }

    return this.#linkBytecode(artifact, [...linksToApply.values()]);
  }

  #linkBytecode(artifact: Artifact, libraries: Link[]): string {
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

  async #getContractFactoryByAbiAndBytecode<
    A extends any[] = any[],
    I = EthersT.Contract,
  >(
    abi: Abi,
    bytecode: EthersT.BytesLike,
    signer?: EthersT.Signer,
  ): Promise<EthersT.ContractFactory<A, I>> {
    const { ContractFactory } = await import("ethers");

    if (signer === undefined) {
      // const signers = await hre.ethers.getSigners();
      const signers = await this.getSigners();
      signer = signers[0];
    }

    return new ContractFactory(abi, bytecode, signer);
  }
}
