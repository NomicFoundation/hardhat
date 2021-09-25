import "@nomiclabs/hardhat-web3";
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
    const networkConfig = env.network.config;

    const provisioner = new LazyTruffleContractProvisioner(
      env.web3,
      networkConfig
    );

    const ta = new TruffleEnvironmentArtifacts(provisioner, env.artifacts);

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
    const formattersPath = require.resolve("web3-core-helpers/src/formatters", {
      paths: [web3Path],
    });

    const formatters = require(formattersPath);

    monkeyPatchMethod(
      formatters,
      "inputTransactionFormatter",
      (og) =>
        function (options: any) {
          if (options.from === undefined) {
            throw new NomicLabsHardhatPluginError(
              "@nomiclabs/hardhat-truffle5",
              "There's no account available in the selected network."
            );
          }

          return og.call(formatters, options);
        }
    );

    monkeyPatchMethod(
      execute,
      "getGasEstimate",
      (og) =>
        async function (params: any, ...others: any[]) {
          await addFromIfNeededAndAvailable(params);
          return og.call(execute, params, ...others);
        }
    );

    monkeyPatchMethod(
      execute,
      "prepareCall",
      (og) =>
        async function (...args: any[]) {
          const ret = await og.apply(execute, args);
          await addFromIfNeededAndAvailable(ret.params);

          return ret;
        }
    );

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
          toChecksumAddress,
          bufferToHex,
          toBuffer,
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
        "@nomiclabs/hardhat-truffle5",
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

subtask(TASK_TEST_SETUP_TEST_ENVIRONMENT, async (_, { web3, network }) => {
  if (network.name !== HARDHAT_NETWORK_NAME) {
    accounts = await web3.eth.getAccounts();
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

function monkeyPatchMethod(
  object: any,
  property: string,
  newImplementationCreator: (originalImplementation: any) => any
) {
  const originalImplementationProperty = Symbol.for(`__${property}`);

  let originalImplementation: any;

  if (object[originalImplementationProperty] !== undefined) {
    originalImplementation = object[originalImplementationProperty];
  } else {
    Object.defineProperty(object, originalImplementationProperty, {
      configurable: true,
      writable: true,
      enumerable: false,
      value: object[property],
    });

    originalImplementation = object[property];
  }

  object[property] = newImplementationCreator(originalImplementation);
}
