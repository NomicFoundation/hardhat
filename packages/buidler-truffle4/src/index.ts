import {
  TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS,
  TASK_TEST_SETUP_TEST_ENVIRONMENT,
} from "@nomiclabs/buidler/builtin-tasks/task-names";
import {
  extendEnvironment,
  internalTask,
  usePlugin,
} from "@nomiclabs/buidler/config";
import { glob } from "@nomiclabs/buidler/internal/util/glob";
import {
  HARDHAT_NETWORK_NAME,
  lazyFunction,
  lazyObject,
  NomicLabsBuidlerPluginError,
} from "@nomiclabs/buidler/plugins";
import { ResolvedHardhatNetworkConfig } from "@nomiclabs/buidler/types";
import { join } from "path";

import { TruffleEnvironmentArtifacts } from "./artifacts";
import {
  getTruffleFixtureFunction,
  hasMigrations,
  hasTruffleFixture,
} from "./fixture";
import { LazyTruffleContractProvisioner } from "./provisioner";
import { RUN_TRUFFLE_FIXTURE_TASK } from "./task-names";
import "./type-extensions";

export default function () {
  usePlugin("@nomiclabs/buidler-web3-legacy");

  let accounts: string[] | undefined;

  extendEnvironment((env) => {
    accounts = undefined;

    env.artifacts = lazyObject(() => {
      const provisioner = new LazyTruffleContractProvisioner(
        env.web3,
        env.network.config,
        env.network.config.from
      );

      return new TruffleEnvironmentArtifacts(
        env.config.paths.artifacts,
        provisioner
      );
    });

    env.assert = lazyFunction(() => require("chai").assert);
    env.expect = lazyFunction(() => require("chai").expect);
    env.contract = (
      description: string,
      definition: (accounts: string[]) => any
    ) => {
      if (env.network.name === HARDHAT_NETWORK_NAME) {
        if (accounts === undefined) {
          const { privateToAddress, bufferToHex } = require("ethereumjs-util");

          const netConfig = env.network.config as ResolvedHardhatNetworkConfig;

          accounts = netConfig.accounts.map((acc) =>
            bufferToHex(privateToAddress(acc.privateKey))
          );
        }
      } else if (accounts === undefined) {
        throw new NomicLabsBuidlerPluginError(
          "@nomiclabs/buidler-truffle4",
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
    async (_, { pweb3, network }) => {
      if (network.name !== HARDHAT_NETWORK_NAME) {
        accounts = await pweb3.eth.getAccounts();
      }
    }
  );

  internalTask(
    TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS,
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
