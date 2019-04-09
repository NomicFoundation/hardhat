import "@nomiclabs/buidler-web3-legacy";
import {
  TASK_COMPILE_GET_SOURCE_PATHS,
  TASK_TEST_SETUP_TEST_ENVIRONMENT
} from "@nomiclabs/buidler/builtin-tasks/task-names";
import { extendEnvironment, internalTask } from "@nomiclabs/buidler/config";
import { lazyObject } from "@nomiclabs/buidler/plugins";
import { join } from "path";

import { glob } from "../../buidler-core/internal/util/glob";

import { TruffleEnvironmentArtifacts } from "./artifacts";
import { LazyTruffleContractProvisioner } from "./provisioner";

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

internalTask(TASK_COMPILE_GET_SOURCE_PATHS, async (_, { config }) => {
  const sources = await glob(join(config.paths.sources, "**/*.sol"));
  const tests = await glob(join(config.paths.sources, "**/*.sol"));
  return [...sources, ...tests];
});
