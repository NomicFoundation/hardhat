import { extendEnvironment } from "@nomiclabs/buidler/config";
import { BuidlerRuntimeEnvironment } from "@nomiclabs/buidler/types";
import { ContractFactory, Signer } from "ethers";

import { EthersProviderWrapper } from "./ethers-provider-wrapper";

declare module "@nomiclabs/buidler/types" {
  interface BuidlerRuntimeEnvironment {
    ethers: {
      provider: EthersProviderWrapper;
      getContract: (name: string) => Promise<ContractFactory>;
      signers: () => Promise<Signer[]>;
    };
  }
}

extendEnvironment((env: BuidlerRuntimeEnvironment) => {});
