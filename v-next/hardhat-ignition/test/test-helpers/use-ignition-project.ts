import type {
  DeployConfig,
  IgnitionModule,
} from "@ignored/hardhat-vnext-ignition-core";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { ensureDir } from "@ignored/hardhat-vnext-utils/fs";

import { clearPendingTransactionsFromMemoryPool } from "./clear-pending-transactions-from-memory-pool.js";
import { TestIgnitionHelper } from "./test-ignition-helper.js";
import { waitForPendingTxs } from "./wait-for-pending-txs.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

declare module "mocha" {
  interface Context {
    hre: HardhatRuntimeEnvironment & { ignition: TestIgnitionHelper };
    deploymentDir: string | undefined;
    runControlledDeploy: (
      ignitionModule: IgnitionModule,
      chainUpdates: (c: TestChainHelper) => Promise<void>,
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
};

export function useEphemeralIgnitionProject(fixtureProjectName: string): void {
  beforeEach("Load environment", async function () {
    process.chdir(
      path.join(__dirname, "../fixture-projects", fixtureProjectName),
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
    throw new Error(
      "Not implemented: need to find a replacement for `resetHardhatContext()`",
    );
  });
}

export function useFileIgnitionProject(
  fixtureProjectName: string,
  deploymentId: string,
  config?: Partial<DeployConfig>,
): void {
  beforeEach("Load environment", async function () {
    process.chdir(
      path.join(__dirname, "../fixture-projects", fixtureProjectName),
    );

    const hre = require("hardhat");

    const deploymentDir = path.join(
      path.resolve(
        __dirname,
        `../fixture-projects/${fixtureProjectName}/ignition`,
      ),
      "deployments",
      deploymentId,
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

    await ensureDir(deploymentDir);

    this.runControlledDeploy = (
      ignitionModule: IgnitionModule,
      chainUpdates: (c: TestChainHelper) => Promise<void> = async () => {},
    ) => {
      return runDeploy(
        deploymentDir,
        ignitionModule,
        { hre, config: testConfig },
        chainUpdates,
      );
    };
  });

  afterEach("reset hardhat context", function () {
    throw new Error(
      "Not implemented: need to find a replacement for resetHardhatContext()",
    );

    // if (this.deploymentDir === undefined) {
    //   throw new Error(
    //     "Deployment dir not set during cleanup of file based project"
    //   );
    // }

    // removeSync(this.deploymentDir);
  });
}

async function runDeploy(
  deploymentDir: string,
  ignitionModule: IgnitionModule,
  {
    hre,
    config = {},
  }: { hre: HardhatRuntimeEnvironment; config?: Partial<DeployConfig> },
  chainUpdates: (c: TestChainHelper) => Promise<void> = async () => {},
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
  config: Partial<DeployConfig> = {},
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
    deploymentDir,
  );

  return { ignitionHelper, kill };
}

export class TestChainHelper {
  constructor(
    private readonly _hre: HardhatRuntimeEnvironment,
    private readonly _deployPromise: Promise<any>,
    private readonly _exitFn: () => void,
  ) {}

  public async waitForPendingTxs(expectedCount: number): Promise<void> {
    await waitForPendingTxs(this._hre, expectedCount, this._deployPromise);
  }

  /**
   * Mine the next block, optionally waiting for pending transactions to
   * build up before mining.
   *
   * @param pendingTxToAwait - the number of pending tx that should be in
   * the block before mining
   */
  public async mineBlock(pendingTxToAwait: number = 0): Promise<any> {
    if (pendingTxToAwait > 0) {
      await waitForPendingTxs(this._hre, pendingTxToAwait, this._deployPromise);
    }

    return this._hre.network.provider.send("evm_mine");
  }

  public async clearMempool(pendingTxToAwait: number = 0): Promise<void> {
    if (pendingTxToAwait > 0) {
      await waitForPendingTxs(this._hre, pendingTxToAwait, this._deployPromise);
    }

    return clearPendingTransactionsFromMemoryPool(this._hre);
  }

  /**
   * Exit from the deploy on the next block tick.
   */
  public exitDeploy(): void {
    this._exitFn();
  }
}
