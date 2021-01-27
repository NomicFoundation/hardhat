import type * as ethers from "ethers";

import type { SignerWithAddress } from "../signers";

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

export interface HardhatEthersHelpers {
  provider: ethers.providers.JsonRpcProvider;

  getContractFactory: typeof getContractFactory;
  getContractAt: (
    nameOrAbi: string | any[],
    address: string,
    signer?: ethers.Signer
  ) => Promise<ethers.Contract>;
  getSigner: (address: string) => Promise<SignerWithAddress>;
  getSigners: () => Promise<SignerWithAddress[]>;
}
