import {
  TASK_COMPILE_GET_SOURCE_PATHS,
  TASK_TEST_SETUP_TEST_ENVIRONMENT
} from "@nomiclabs/buidler/builtin-tasks/task-names";
import {
  extendEnvironment,
  internalTask,
  usePlugin
} from "@nomiclabs/buidler/config";
import { glob } from "@nomiclabs/buidler/internal/util/glob";
import {
  BuidlerPluginError,
  ensurePluginLoadedWithUsePlugin,
  lazyObject
} from "@nomiclabs/buidler/plugins";
import { join } from "path";

import { TruffleEnvironmentArtifacts } from "./artifacts";
import { LazyTruffleContractProvisioner } from "./provisioner";

ensurePluginLoadedWithUsePlugin();

export default function() {
  usePlugin("@nomiclabs/buidler-web3");

  extendEnvironment(env => {
    env.artifacts = lazyObject(() => {
      const provisioner = new LazyTruffleContractProvisioner(env.web3);

      const artifacts = new TruffleEnvironmentArtifacts(
        env.config.paths.artifacts,
        provisioner
      );

      const execute = require("truffle-contract/lib/execute");

      let noDefaultAccounts = false;
      let defaultAccount: string | undefined =
        env.config.networks[env.buidlerArguments.network].from;

      async function addFromIfNeededAndAvailable(params: any) {
        if (noDefaultAccounts) {
          return;
        }

        if (params.from === undefined) {
          if (defaultAccount === undefined) {
            const accounts = await env.web3.eth.getAccounts();

            if (accounts.length === 0) {
              noDefaultAccounts = true;
              return;
            }

            defaultAccount = accounts[0];
          }

          params.from = defaultAccount;
        }
      }

      const web3Path = require.resolve("web3");
      const formattersPath = require.resolve(
        "web3-core-helpers/src/formatters",
        {
          paths: [web3Path]
        }
      );

      const formatters = require(formattersPath);
      const originalFormatter = formatters.inputTransactionFormatter;
      formatters.inputTransactionFormatter = function(options: any) {
        if (options.from === undefined) {
          throw new BuidlerPluginError(
            "There's no account available in the selected network."
          );
        }

        return originalFormatter(options);
      };

      const originalGetGasEstimate = execute.getGasEstimate;
      execute.getGasEstimate = async function(params: any, ...others: any[]) {
        await addFromIfNeededAndAvailable(params);
        return originalGetGasEstimate.call(this, params, ...others);
      };

      const originalPrepareCall = execute.prepareCall;
      execute.prepareCall = async function(...args: any[]) {
        const ret = await originalPrepareCall.apply(this, args);
        await addFromIfNeededAndAvailable(ret.params);

        return ret;
      };

      return artifacts;
    });
  });

  internalTask(TASK_TEST_SETUP_TEST_ENVIRONMENT, async (_, { web3 }) => {
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

  internalTask(
    TASK_COMPILE_GET_SOURCE_PATHS,
    async (_, { config }, runSuper) => {
      const sources = await runSuper();
      const testSources = await glob(join(config.paths.tests, "**", "*.sol"));
      return [...sources, ...testSources];
    }
  );
}
