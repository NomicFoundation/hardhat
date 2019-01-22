import "buidler-web3-legacy";
import { extendEnvironment, internalTask } from "buidler/config";

import { TruffleEnvironmentArtifacts } from "./artifacts";
import { LazyTruffleContractProvisioner } from "./provisioner";

declare module "buidler/types" {
  export interface BuidlerRuntimeEnvironment {
    artifacts: TruffleEnvironmentArtifacts;
  }
}

extendEnvironment(env => {
  const provisioner = new LazyTruffleContractProvisioner(
    env.web3,
    env.config.networks[env.buidlerArguments.network].from
  );

  env.artifacts = new TruffleEnvironmentArtifacts(
    env.config.paths.artifacts,
    provisioner
  );
});

internalTask(
  "builtin:setup-test-environment",
  async (_, { config, provider }) => {
    const accounts = await provider.send("eth_accounts");

    const { assert } = await import("chai");

    const globalAsAny = global as any;
    globalAsAny.assert = assert;

    globalAsAny.contract = (
      description: string,
      definition: ((accounts: string) => any)
    ) =>
      describe(description, () => {
        definition(accounts);
      });
  }
);
