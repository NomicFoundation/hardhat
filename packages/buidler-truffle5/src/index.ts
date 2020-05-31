import {
  TASK_COMPILE_GET_SOURCE_PATHS,
  TASK_TEST_SETUP_TEST_ENVIRONMENT,
} from "@nomiclabs/buidler/builtin-tasks/task-names";
import {
  extendEnvironment,
  internalTask,
  usePlugin,
} from "@nomiclabs/buidler/config";
import { glob } from "@nomiclabs/buidler/internal/util/glob";
import {
  BUIDLEREVM_NETWORK_NAME,
  BuidlerPluginError,
  lazyFunction,
  lazyObject,
} from "@nomiclabs/buidler/plugins";
import { BuidlerNetworkConfig } from "@nomiclabs/buidler/types";
import { join } from "path";

import { TruffleEnvironmentArtifacts } from "./artifacts";
import {
  getTruffleFixtureFunction,
  hasMigrations,
  hasTruffleFixture,
} from "./fixture";
import { LazyTruffleContractProvisioner } from "./provisioner";
import { RUN_TRUFFLE_FIXTURE_TASK } from "./task-names";

// See buidler-core's CONTRIBUTING.md
let originalFormatter: any;
let originalGetGasEstimate: any;
let originalPrepareCall: any;

export default function () {
  usePlugin("@nomiclabs/buidler-web3");

  let accounts: string[] | undefined;

  extendEnvironment((env) => {
    env.artifacts = lazyObject(() => {
      const networkConfig = env.network.config;

      const provisioner = new LazyTruffleContractProvisioner(
        env.web3,
        networkConfig
      );

      const artifacts = new TruffleEnvironmentArtifacts(
        env.config.paths.artifacts,
        provisioner
      );

      const execute = require("@nomiclabs/truffle-contract/lib/execute");

      let noDefaultAccounts = false;
      let defaultAccount: string | undefined = networkConfig.from;

      async function addFromIfNeededAndAvailable(params: any) {
        if (noDefaultAccounts) {
          return;
        }

        if (params.from === undefined) {
          if (defaultAccount === undefined) {
            accounts = await env.web3.eth.getAccounts();

            if (accounts!.length === 0) {
              noDefaultAccounts = true;
              return;
            }

            defaultAccount = accounts![0];
          }

          params.from = defaultAccount;
        }
      }

      const web3Path = require.resolve("web3");
      const formattersPath = require.resolve(
        "web3-core-helpers/src/formatters",
        {
          paths: [web3Path],
        }
      );

      const formatters = require(formattersPath);

      if (originalFormatter === undefined) {
        originalFormatter = formatters.inputTransactionFormatter;
      }

      formatters.inputTransactionFormatter = function (options: any) {
        if (options.from === undefined) {
          throw new BuidlerPluginError(
            "There's no account available in the selected network."
          );
        }

        return originalFormatter(options);
      };

      if (originalGetGasEstimate === undefined) {
        originalGetGasEstimate = execute.getGasEstimate;
      }

      execute.getGasEstimate = async function (params: any, ...others: any[]) {
        await addFromIfNeededAndAvailable(params);
        return originalGetGasEstimate.call(this, params, ...others);
      };

      if (originalPrepareCall === undefined) {
        originalPrepareCall = execute.prepareCall;
      }
      execute.prepareCall = async function (...args: any[]) {
        const ret = await originalPrepareCall.apply(this, args);
        await addFromIfNeededAndAvailable(ret.params);

        return ret;
      };

      return artifacts;
    });

    env.assert = lazyFunction(() => require("chai").assert);
    env.expect = lazyFunction(() => require("chai").expect);
    env.contract = (
      description: string,
      definition: (accounts: string[]) => any
    ) => {
      if (env.network.name === BUIDLEREVM_NETWORK_NAME) {
        if (accounts === undefined) {
          const {
            privateToAddress,
            toChecksumAddress,
            bufferToHex,
          } = require("ethereumjs-util");

          const netConfig = env.network.config as Required<
            BuidlerNetworkConfig
          >;

          accounts = netConfig.accounts.map((acc) =>
            toChecksumAddress(bufferToHex(privateToAddress(acc.privateKey)))
          );
        }
      } else if (accounts === undefined) {
        throw new BuidlerPluginError(
          `To run your tests that use Truffle's "contract()" function with the network "${env.network.name}", you need to use Buidler's CLI`
        );
      }

      describe(`Contract: ${description}`, () => {
        before("Running truffle fixture if available", async function () {
          await env.run(RUN_TRUFFLE_FIXTURE_TASK);
        });

        definition(accounts!);
      });
    };
  });

  internalTask(
    TASK_TEST_SETUP_TEST_ENVIRONMENT,
    async (_, { web3, network }) => {
      if (network.name !== BUIDLEREVM_NETWORK_NAME) {
        accounts = await web3.eth.getAccounts();
      }
    }
  );

  internalTask(
    TASK_COMPILE_GET_SOURCE_PATHS,
    async (_, { config }, runSuper) => {
      const sources = await runSuper();
      const testSources = await glob(join(config.paths.tests, "**", "*.sol"));
      return [...sources, ...testSources];
    }
  );

  let wasWarningShown = false;
  internalTask(RUN_TRUFFLE_FIXTURE_TASK, async (_, env) => {
    const paths = env.config.paths;
    const hasFixture = await hasTruffleFixture(paths);

    if (!wasWarningShown) {
      if ((await hasMigrations(paths)) && !hasFixture) {
        console.warn(
          "Your project has Truffle migrations, which have to be turn into a fixture to run your tests with Buidler"
        );

        wasWarningShown = true;
      }
    }

    if (hasFixture) {
      const fixture = await getTruffleFixtureFunction(paths);
      await fixture(env);
    }
  });
}
