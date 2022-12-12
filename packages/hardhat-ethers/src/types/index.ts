import type * as ethers from "ethers";
import type { SignerWithAddress } from "../signers";

import { Artifact } from "hardhat/types";

export interface Libraries {
  [libraryName: string]: string;
}

export interface FactoryOptions {
  signer?: ethers.Signer;
  libraries?: Libraries;
}

export declare function getContractFactory(
  name: string,
  signerOrOptions?: ethers.Signer | FactoryOptions
): Promise<ethers.ContractFactory>;
export declare function getContractFactory(
  abi: any[],
  bytecode: ethers.utils.BytesLike,
  signer?: ethers.Signer
): Promise<ethers.ContractFactory>;

export declare function deployContract(
  name: string,
  signerOrOptions?: ethers.Signer | FactoryOptions
): Promise<ethers.Contract>;

export declare function deployContract(
  name: string,
  args: any[],
  signerOrOptions?: ethers.Signer | FactoryOptions
): Promise<ethers.Contract>;

export interface HardhatEthersHelpers {
  provider: ethers.providers.JsonRpcProvider;

  getContractFactory: typeof getContractFactory;
  getContractFactoryFromArtifact: (
    artifact: Artifact,
    signerOrOptions?: ethers.Signer | FactoryOptions
  ) => Promise<ethers.ContractFactory>;
  getContractAt: (
    nameOrAbi: string | any[],
    address: string,
    signer?: ethers.Signer
  ) => Promise<ethers.Contract>;
  getContractAtFromArtifact: (
    artifact: Artifact,
    address: string,
    signer?: ethers.Signer
  ) => Promise<ethers.Contract>;
  getSigner: (address: string) => Promise<SignerWithAddress>;
  getSigners: () => Promise<SignerWithAddress[]>;
  getImpersonatedSigner: (address: string) => Promise<SignerWithAddress>;
  deployContract: typeof deployContract;
}
