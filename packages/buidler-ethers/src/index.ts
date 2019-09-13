import { extendEnvironment } from "@nomiclabs/buidler/config";
import { lazyObject, readArtifact } from "@nomiclabs/buidler/plugins";
import { BuidlerRuntimeEnvironment } from "@nomiclabs/buidler/types";

export default function() {
  extendEnvironment((env: BuidlerRuntimeEnvironment) => {
    env.ethers = lazyObject(() => {
      const { EthersProviderWrapper } = require("./ethers-provider-wrapper");

      return {
        provider: new EthersProviderWrapper(env.network.provider),
        getContract: async (name: string) => {
          const { ethers } = await import("ethers");
          const artifact = await readArtifact(env.config.paths.artifacts, name);
          const bytecode = artifact.bytecode;
          const signers = await env.ethers.signers();
          return new ethers.ContractFactory(artifact.abi, bytecode, signers[0]);
        },
        signers: async () => {
          const accounts = await env.ethers.provider.listAccounts();
          return accounts.map((account: string) =>
            env.ethers.provider.getSigner(account)
          );
        }
      };
    });
  });
}
