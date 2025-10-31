import { DeployConfig, IgnitionModule } from "@nomicfoundation/ignition-core";
import { ensureDirSync, removeSync } from "fs-extra";
import { resetHardhatContext } from "hardhat/plugins-testing";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import path from "path";

import { clearPendingTransactionsFromMemoryPool } from "./clear-pending-transactions-from-memory-pool";
import { TestIgnitionHelper } from "./test-ignition-helper";
import { waitForPendingTxs } from "./wait-for-pending-txs";

declare module "mocha" {
  interface Context {
    hre: HardhatRuntimeEnvironment & { ignition: TestIgnitionHelper };
    deploymentDir: string | undefined;
    runControlledDeploy: (
      ignitionModule: IgnitionModule,
      chainUpdates: (c: TestChainHelper) => Promise<void>
    ) => ReturnType<typeof runDeploy>;
    config: Partial<DeployConfig>;
  }
}

const defaultTestConfig: DeployConfig = {
  maxFeeBumps: 5,
  timeBeforeBumpingFees: 3 * 60 * 1000,
  blockPollingInterval: 200,
  requiredConfirmations: 1,
  disableFeeBumping: false,
  maxRetries: 10,
  retryInterval: 1000,
};

export function useEphemeralIgnitionProject(fixtureProjectName: string) {
  beforeEach("Load environment", async function () {
    process.chdir(
      path.join(__dirname, "../fixture-projects", fixtureProjectName)
    );

    const hre = require("hardhat");

    await hre.network.provider.send("evm_setAutomine", [true]);
    await hre.run("compile", { quiet: true });

    this.hre = hre;
    (this.hre as any).originalIgnition = this.hre.ignition;
    this.hre.ignition = new TestIgnitionHelper(hre);
    this.deploymentDir = undefined;
  });

  afterEach("reset hardhat context", function () {
    resetHardhatContext();
  });
}

export function useFileIgnitionProject(
  fixtureProjectName: string,
  deploymentId: string,
  config?: Partial<DeployConfig>
) {
  beforeEach("Load environment", async function () {
    process.chdir(
      path.join(__dirname, "../fixture-projects", fixtureProjectName)
    );

    const hre = require("hardhat");

    const deploymentDir = path.join(
      path.resolve(
        __dirname,
        `../fixture-projects/${fixtureProjectName}/ignition`
      ),
      "deployments",
      deploymentId
    );

    this.hre = hre;
    this.hre.ignition = new TestIgnitionHelper(hre);
    this.deploymentDir = deploymentDir;

    await hre.run("compile", { quiet: true });

    const testConfig: Partial<DeployConfig> = {
      ...defaultTestConfig,
      ...config,
    };

    this.config = testConfig;

    ensureDirSync(deploymentDir);

    this.runControlledDeploy = (
      ignitionModule: IgnitionModule,
      chainUpdates: (c: TestChainHelper) => Promise<void> = async () => {}
    ) => {
      return runDeploy(
        deploymentDir,
        ignitionModule,
        { hre, config: testConfig },
        chainUpdates
      );
    };
  });

  afterEach("reset hardhat context", function () {
    resetHardhatContext();

    if (this.deploymentDir === undefined) {
      throw new Error(
        "Deployment dir not set during cleanup of file based project"
      );
    }

    removeSync(this.deploymentDir);
  });
}

async function runDeploy(
  deploymentDir: string,
  ignitionModule: IgnitionModule,
  {
    hre,
    config = {},
  }: { hre: HardhatRuntimeEnvironment; config?: Partial<DeployConfig> },
  chainUpdates: (c: TestChainHelper) => Promise<void> = async () => {}
): Promise<ReturnType<TestIgnitionHelper["deploy"]>> {
  const { ignitionHelper: ignitionHelper, kill: killFn } =
    setupIgnitionHelperRiggedToThrow(hre, deploymentDir, config);

  try {
    const deployPromise = ignitionHelper.deploy(ignitionModule, {
      config,
    });

    const chainHelper = new TestChainHelper(hre, deployPromise, killFn);

    const [result] = await Promise.all([
      deployPromise,
      chainUpdates(chainHelper),
    ]);

    return result;
  } catch (error) {
    if (error instanceof Error && error.message === "Killing deploy process") {
      return {};
    }

    throw error;
  }
}

function setupIgnitionHelperRiggedToThrow(
  hre: HardhatRuntimeEnvironment,
  deploymentDir: string,
  config: Partial<DeployConfig> = {}
): {
  ignitionHelper: TestIgnitionHelper;
  kill: () => void;
} {
  let trigger: boolean = false;

  const kill = () => {
    trigger = true;
  };

  const proxiedProvider = new Proxy(hre.network.provider, {
    get(target: any, key) {
      if (trigger) {
        trigger = false;
        throw new Error("Killing deploy process");
      }

      return target[key];
    },
  });

  const ignitionHelper = new TestIgnitionHelper(
    hre,
    config,
    proxiedProvider,
    deploymentDir
  );

  return { ignitionHelper, kill };
}

export class TestChainHelper {
  #hre: HardhatRuntimeEnvironment;
  #deployPromise: Promise<any>;
  #exitFn: () => void;

  constructor(
    hre: HardhatRuntimeEnvironment,
    deployPromise: Promise<any>,
    exitFn: () => void
  ) {
    this.#hre = hre;
    this.#deployPromise = deployPromise;
    this.#exitFn = exitFn;
  }

  public async waitForPendingTxs(expectedCount: number) {
    await waitForPendingTxs(this.#hre, expectedCount, this.#deployPromise);
  }

  /**
   * Mine the next block, optionally waiting for pending transactions to
   * build up before mining.
   *
   * @param pendingTxToAwait - the number of pending tx that should be in
   * the block before mining
   */
  public async mineBlock(pendingTxToAwait: number = 0) {
    if (pendingTxToAwait > 0) {
      await waitForPendingTxs(this.#hre, pendingTxToAwait, this.#deployPromise);
    }

    return this.#hre.network.provider.send("evm_mine");
  }

  public async clearMempool(pendingTxToAwait: number = 0) {
    if (pendingTxToAwait > 0) {
      await waitForPendingTxs(this.#hre, pendingTxToAwait, this.#deployPromise);
    }

    return clearPendingTransactionsFromMemoryPool(this.#hre);
  }

  /**
   * Exit from the deploy on the next block tick.
   */
  public exitDeploy() {
    this.#exitFn();
  }
}
