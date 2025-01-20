import type { Abi, Artifact } from "@ignored/hardhat-vnext/types/artifacts";
import type * as ethers from "ethers";

export type HardhatEthers = typeof ethers & HardhatEthersHelpers;

export interface Libraries {
  [libraryName: string]: string | ethers.Addressable;
}

export interface FactoryOptions {
  signer?: ethers.Signer;
  libraries?: Libraries;
}

export type DeployContractOptions = FactoryOptions & ethers.Overrides;

export type HardhatEthersProvider = ethers.Provider & {
  getSigner(address?: number | string): Promise<HardhatEthersSigner>;
  send(method: string, params?: any[]): Promise<any>;
};

export type HardhatEthersSigner = ethers.Signer & {
  address: string;
};

export interface HardhatEthersHelpers {
  provider: HardhatEthersProvider;

  getContractFactory<A extends any[] = any[], I = ethers.Contract>(
    name: string,
    signerOrOptions?: ethers.Signer | FactoryOptions,
  ): Promise<ethers.ContractFactory<A, I>>;
  getContractFactory<A extends any[] = any[], I = ethers.Contract>(
    abi: any[] | Abi,
    bytecode: ethers.BytesLike,
    signer?: ethers.Signer,
  ): Promise<ethers.ContractFactory<A, I>>;

  getContractFactoryFromArtifact<A extends any[] = any[], I = ethers.Contract>(
    artifact: Artifact<Abi>,
    signerOrOptions?: ethers.Signer | FactoryOptions,
  ): Promise<ethers.ContractFactory<A, I>>;

  getContractAt: (
    nameOrAbi: string | any[] | Abi,
    address: string | ethers.Addressable,
    signer?: ethers.Signer,
  ) => Promise<ethers.Contract>;

  getContractAtFromArtifact: (
    artifact: Artifact,
    address: string,
    signer?: ethers.Signer,
  ) => Promise<ethers.Contract>;

  deployContract(
    name: string,
    signerOrOptions?: ethers.Signer | DeployContractOptions,
  ): Promise<ethers.Contract>;
  deployContract(
    name: string,
    args: any[],
    signerOrOptions?: ethers.Signer | DeployContractOptions,
  ): Promise<ethers.Contract>;

  getSigner: (address: string) => Promise<HardhatEthersSigner>;
  getSigners: () => Promise<HardhatEthersSigner[]>;
  getImpersonatedSigner: (address: string) => Promise<HardhatEthersSigner>;
}
