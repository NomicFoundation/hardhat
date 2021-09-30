import "@nomiclabs/hardhat-web3-legacy";
import {
  TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS,
  TASK_TEST_SETUP_TEST_ENVIRONMENT,
} from "hardhat/builtin-tasks/task-names";
import { extendEnvironment, subtask } from "hardhat/config";
import { normalizeHardhatNetworkAccountsConfig } from "hardhat/internal/core/providers/util";
import { glob } from "hardhat/internal/util/glob";
import {
  HARDHAT_NETWORK_NAME,
  lazyFunction,
  NomicLabsHardhatPluginError,
} from "hardhat/plugins";
import { HardhatNetworkConfig } from "hardhat/types";
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

type Describe = (
  description: string,
  definition: (accounts: string[]) => any
) => void;

let accounts: string[] | undefined;

extendEnvironment((env) => {
  env.artifacts.require = lazyFunction(() => {
    const provisioner = new LazyTruffleContractProvisioner(
      env.web3,
      env.network.config,
      env.network.config.from
    );

    const ta = new TruffleEnvironmentArtifacts(provisioner, env.artifacts);

    return ta.require.bind(ta);
  });

  env.assert = lazyFunction(() => require("chai").assert);
  env.expect = lazyFunction(() => require("chai").expect);
  const describeContract = (
    description: string,
    definition: (accounts: string[]) => any,
    modifier?: "only" | "skip"
  ) => {
    if (env.network.name === HARDHAT_NETWORK_NAME) {
      if (accounts === undefined) {
        const {
          privateToAddress,
          bufferToHex,
          toBuffer,
          toChecksumAddress,
        } = require("ethereumjs-util");

        const netConfig = env.network.config as HardhatNetworkConfig;

        accounts = normalizeHardhatNetworkAccountsConfig(
          netConfig.accounts
        ).map((acc) => {
          const buffer = toBuffer(acc.privateKey);
          return toChecksumAddress(bufferToHex(privateToAddress(buffer)));
        });
      }
    } else if (accounts === undefined) {
      throw new NomicLabsHardhatPluginError(
        "@nomiclabs/hardhat-truffle4",
        `To run your tests that use Truffle's "contract()" function with the network "${env.network.name}", you need to use Hardhat's CLI`
      );
    }

    const describeMod = modifier === undefined ? describe : describe[modifier];

    describeMod(`Contract: ${description}`, () => {
      before("Running truffle fixture if available", async function () {
        await env.run(RUN_TRUFFLE_FIXTURE_TASK);
      });

      definition(accounts!);
    });
  };

  env.contract = Object.assign<Describe, Record<"only" | "skip", Describe>>(
    (desc, def) => describeContract(desc, def),
    {
      only: (desc, def) => describeContract(desc, def, "only"),
      skip: (desc, def) => describeContract(desc, def, "skip"),
    }
  );
});

subtask(TASK_TEST_SETUP_TEST_ENVIRONMENT, async (_, { pweb3, network }) => {
  if (network.name !== HARDHAT_NETWORK_NAME) {
    accounts = await pweb3.eth.getAccounts();
  }
});

subtask(
  TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS,
  async (_, { config }, runSuper) => {
    const sources = await runSuper();
    const testSources = await glob(join(config.paths.tests, "**", "*.sol"));
    return [...sources, ...testSources];
  }
);

let wasWarningShown = false;
subtask(RUN_TRUFFLE_FIXTURE_TASK, async (_, env) => {
  const paths = env.config.paths;
  const hasFixture = await hasTruffleFixture(paths);

  if (!wasWarningShown) {
    if ((await hasMigrations(paths)) && !hasFixture) {
      console.warn(
        "Your project has Truffle migrations, which have to be turned into a fixture to run your tests with Hardhat"
      );

      wasWarningShown = true;
    }
  }

  if (hasFixture) {
    const fixture = await getTruffleFixtureFunction(paths);
    await fixture(env);
  }
});
