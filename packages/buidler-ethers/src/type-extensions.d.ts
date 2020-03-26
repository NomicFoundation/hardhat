import "@nomiclabs/buidler/types";
import ethers from "ethers";
import { JsonRpcProvider } from "ethers/providers";

declare module "@nomiclabs/buidler/types" {
  function getContractFactory(
    name: string,
    signer?: ethers.Signer
  ): Promise<ethers.ContractFactory>;
  function getContractFactory(
    abi: any[],
    bytecode: ethers.utils.Arrayish | string,
    signer?: ethers.Signer
  ): Promise<ethers.ContractFactory>;

  interface BuidlerRuntimeEnvironment {
    ethers: {
      provider: JsonRpcProvider;

      getContractFactory: typeof getContractFactory;
      getContractAt: (
        nameOrAbi: string | any[],
        address: string,
        signer?: ethers.Signer
      ) => Promise<ethers.Contract>;
      getSigners: () => Promise<ethers.Signer[]>;

      // Deprecated
      getContract: (name: string) => Promise<ethers.ContractFactory>;
      signers: () => Promise<ethers.Signer[]>;

      // Standard ethers properties
      Contract: typeof ethers.Contract;
      ContractFactory: typeof ethers.ContractFactory;
      VoidSigner: typeof ethers.VoidSigner;
      Signer: typeof ethers.Signer;
      Wallet: typeof ethers.Wallet;
      constants: typeof ethers.constants;
      errors: typeof ethers.errors;
      providers: typeof ethers.providers;
      utils: typeof ethers.utils;
      wordlists: typeof ethers.wordlists;
      platform: typeof ethers.platform;
      version: typeof ethers.version;
      getDefaultProvider: typeof ethers.getDefaultProvider;
    };
  }
}
