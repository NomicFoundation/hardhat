import type * as ethers from "ethers";
import type { Artifact } from "hardhat/types";
import type { CustomEthersProvider } from "../internal/custom-ethers-provider";
import type { CustomEthersSigner } from "../signers";

export interface Libraries {
  [libraryName: string]: string | ethers.Addressable;
}

export interface FactoryOptions {
  signer?: ethers.Signer;
  libraries?: Libraries;
}

export declare function getContractFactory<
  A extends any[] = any[],
  I = ethers.BaseContract
>(
  name: string,
  signerOrOptions?: ethers.Signer | FactoryOptions
): Promise<ethers.ContractFactory<A, I>>;
export declare function getContractFactory<
  A extends any[] = any[],
  I = ethers.BaseContract
>(
  abi: any[],
  bytecode: ethers.BytesLike,
  signer?: ethers.Signer
): Promise<ethers.ContractFactory<A, I>>;

export declare function deployContract(
  name: string,
  signerOrOptions?: ethers.Signer | FactoryOptions
): Promise<ethers.Contract>;

export declare function deployContract(
  name: string,
  args: any[],
  signerOrOptions?: ethers.Signer | FactoryOptions
): Promise<ethers.Contract>;

export declare function getContractFactoryFromArtifact<
  A extends any[] = any[],
  I = ethers.BaseContract
>(
  artifact: Artifact,
  signerOrOptions?: ethers.Signer | FactoryOptions
): Promise<ethers.ContractFactory<A, I>>;

export interface HardhatEthersHelpers {
  provider: CustomEthersProvider;

  getContractFactory: typeof getContractFactory;
  getContractFactoryFromArtifact: typeof getContractFactoryFromArtifact;
  getContractAt: (
    nameOrAbi: string | any[],
    address: string | ethers.Addressable,
    signer?: ethers.Signer
  ) => Promise<ethers.Contract>;
  getContractAtFromArtifact: (
    artifact: Artifact,
    address: string,
    signer?: ethers.Signer
  ) => Promise<ethers.Contract>;
  getSigner: (address: string) => Promise<CustomEthersSigner>;
  getSigners: () => Promise<CustomEthersSigner[]>;
  getImpersonatedSigner: (address: string) => Promise<CustomEthersSigner>;
  deployContract: typeof deployContract;
}
