import "@nomiclabs/buidler-web3";
import { extendEnvironment, internalTask } from "@nomiclabs/buidler/config";
import { BuidlerPluginError } from "@nomiclabs/buidler/plugins";

import { TruffleEnvironmentArtifacts } from "./artifacts";
import { LazyTruffleContractProvisioner } from "./provisioner";

declare module "@nomiclabs/buidler/types" {
  export interface BuidlerRuntimeEnvironment {
    artifacts: TruffleEnvironmentArtifacts;
  }
}

extendEnvironment(env => {
  const provisioner = new LazyTruffleContractProvisioner(env.web3);

  env.artifacts = new TruffleEnvironmentArtifacts(
    env.config.paths.artifacts,
    provisioner
  );

  const execute = require("truffle-contract/lib/execute");

  let defaultAccount: string | undefined =
    env.config.networks[env.buidlerArguments.network].from;

  async function addFromIfNeeded(params: any) {
    if (params.from === undefined) {
      if (defaultAccount === undefined) {
        const accounts = await env.web3.eth.getAccounts();

        if (accounts.length === 0) {
          throw new BuidlerPluginError(
            "There's no account available in the selected network."
          );
        }

        defaultAccount = accounts[0];
      }

      params.from = defaultAccount;
    }
  }

  const originalGetGasEstimate = execute.getGasEstimate;
  execute.getGasEstimate = async function(params: any, ...others: any[]) {
    await addFromIfNeeded(params);
    return originalGetGasEstimate.call(this, params, ...others);
  };

  const originalPrepareCall = execute.prepareCall;
  execute.prepareCall = async function(...args: any[]) {
    const ret = await originalPrepareCall.apply(this, args);
    await addFromIfNeeded(ret.params);

    return ret;
  };
});

internalTask("builtin:setup-test-environment", async (_, { web3 }) => {
  const accounts = await web3.eth.getAccounts();
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
