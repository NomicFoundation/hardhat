import "@nomiclabs/buidler/types";
import { ContractFactory, Signer } from "ethers";
import { JsonRpcProvider } from "ethers/providers";

declare module "@nomiclabs/buidler/types" {
  interface BuidlerRuntimeEnvironment {
    ethers: {
      provider: JsonRpcProvider;
      getContract: (name: string) => Promise<ContractFactory>;
      signers: () => Promise<Signer[]>;
    };
  }
}
