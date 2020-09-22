import "@nomiclabs/buidler/types";
import * as ethers from "ethers";

declare module "@nomiclabs/buidler/types" {
  function getContractFactory(
    name: string,
    signer?: ethers.Signer
  ): Promise<ethers.ContractFactory>;
  function getContractFactory(
    abi: any[],
    bytecode: ethers.utils.BytesLike | string,
    signer?: ethers.Signer
  ): Promise<ethers.ContractFactory>;

  interface BuidlerRuntimeEnvironment {
    ethers: {
      provider: ethers.providers.JsonRpcProvider;

      getContractFactory: typeof getContractFactory;
      getContractAt: (
        nameOrAbi: string | any[],
        address: string,
        signer?: ethers.Signer
      ) => Promise<ethers.Contract>;
      getSigners: () => Promise<ethers.Signer[]>;

      // Standard ethers properties
      Signer: typeof ethers.Signer;
      Wallet: typeof ethers.Wallet;
      VoidSigner: typeof ethers.VoidSigner;
      getDefaultProvider: typeof ethers.getDefaultProvider;
      providers: typeof ethers.providers;
      Contract: typeof ethers.Contract;
      ContractFactory: typeof ethers.ContractFactory;
      BigNumber: typeof ethers.BigNumber;
      FixedNumber: typeof ethers.FixedNumber;
      constants: typeof ethers.constants;
      errors: typeof ethers.errors;
      logger: typeof ethers.logger;
      utils: typeof ethers.utils;
      wordlists: typeof ethers.wordlists;
      version: typeof ethers.version;
      Wordlist: typeof ethers.Wordlist;
    };
  }
}
