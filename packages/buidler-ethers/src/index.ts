import { extendEnvironment } from "@nomiclabs/buidler/config";
import { lazyObject, readArtifact } from "@nomiclabs/buidler/plugins";
import { BuidlerRuntimeEnvironment } from "@nomiclabs/buidler/types";
import { ContractFactory, Signer } from "ethers";

import { EthersProviderWrapper } from "./ethers-provider-wrapper";

extendEnvironment((env: BuidlerRuntimeEnvironment) => {
  env.ethers = {
    provider: lazyObject(() => {
      return new EthersProviderWrapper(env.ethereum);
    }),
    getContract: async (name: string): Promise<ContractFactory> => {
      const { ethers } = await import("ethers");
      const artifact = await readArtifact(env.config.paths.artifacts, name);
      const bytecode = artifact.bytecode;
      const signers = await env.ethers.signers();
      return new ethers.ContractFactory(artifact.abi, bytecode, signers[0]);
    },
    signers: async (): Promise<Signer[]> => {
      const accounts = await env.ethers.provider.listAccounts();
      return accounts.map((account: string) =>
        env.ethers.provider.getSigner(account)
      );
    }
  };
});
