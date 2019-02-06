import { extendEnvironment } from "@nomiclabs/buidler/config";
import { readArtifact } from "@nomiclabs/buidler/plugins";
import { BuidlerRuntimeEnvironment } from "@nomiclabs/buidler/types";
import { ContractFactory, ethers, Signer } from "ethers";

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

extendEnvironment((env: BuidlerRuntimeEnvironment) => {
  const wrapper = new EthersProviderWrapper(env.provider);
  env.ethers = {
    provider: wrapper,
    getContract: async (name: string): Promise<ContractFactory> => {
      const artifact = await readArtifact(env.config.paths.artifacts, name);
      const bytecode = artifact.bytecode;
      const signers = await env.ethers.signers();
      return new ethers.ContractFactory(artifact.abi, bytecode, signers[0]);
    },
    signers: async (): Promise<Signer[]> => {
      const accounts = await env.provider.send("eth_accounts");
      return accounts.map((account: string) => wrapper.getSigner(account));
    }
  };
});
