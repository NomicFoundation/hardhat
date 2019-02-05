import "@nomiclabs/buidler-web3-legacy";
import { TASK_TEST_SETUP_TEST_ENVIRONMENT } from "@nomiclabs/buidler/builtin-tasks/task-names";
import { extendEnvironment, internalTask } from "@nomiclabs/buidler/config";
import { lazyObject } from "@nomiclabs/buidler/plugins";

import { TruffleEnvironmentArtifacts } from "./artifacts";
import { LazyTruffleContractProvisioner } from "./provisioner";

declare module "@nomiclabs/buidler/types" {
  export interface BuidlerRuntimeEnvironment {
    artifacts: TruffleEnvironmentArtifacts;
  }
}

extendEnvironment(env => {
  env.artifacts = lazyObject(() => {
    const provisioner = new LazyTruffleContractProvisioner(
      env.web3,
      env.config.networks[env.buidlerArguments.network].from
    );

    return new TruffleEnvironmentArtifacts(
      env.config.paths.artifacts,
      provisioner
    );
  });
});

internalTask(TASK_TEST_SETUP_TEST_ENVIRONMENT, async (_, { pweb3 }) => {
  const accounts = await pweb3.eth.getAccounts();

  const { assert } = await import("chai");

  const globalAsAny = global as any;
  globalAsAny.assert = assert;

  globalAsAny.contract = (
    description: string,
    definition: (accounts: string) => any
  ) =>
    describe(description, () => {
      definition(accounts);
    });
});
