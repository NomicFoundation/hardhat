import type {
  DeployConfig,
  IgnitionModule,
} from "@nomicfoundation/ignition-core";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import type { NetworkConnection } from "hardhat/types/network";
import type {
  EthereumProvider,
  RequestArguments,
} from "hardhat/types/providers";

import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import { cpSync } from "node:fs";
import path, { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import hardhatNetworkHelpers from "@nomicfoundation/hardhat-network-helpers";
import { ensureDir, remove } from "@nomicfoundation/hardhat-utils/fs";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import hardhatIgnition from "../../src/index.js";

import { clearPendingTransactionsFromMemoryPool } from "./clear-pending-transactions-from-memory-pool.js";
import { mineBlock } from "./mine-block.js";
import { TestIgnitionHelper } from "./test-ignition-helper.js";
import { waitForPendingTxs } from "./wait-for-pending-txs.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

declare module "mocha" {
  interface Context {
    hre: HardhatRuntimeEnvironment;
    ignition: TestIgnitionHelper;
    connection: NetworkConnection;
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
  maxRetries: 10,
  retryInterval: 1000,
};

// todo: whenever these tests are migrated to node:test,
// we should use `useEphemeralFixtureProject` from hardhat-test-utils here instead
export function useProject(fixtureProjectName: string): void {
  const basePath = path.resolve(import.meta.dirname, "..", "fixture-projects");
  const tmpProjectPath = path.join("tmp", randomUUID());
  let prevWorkingDir: string;

  before(function () {
    cpSync(
      path.join(basePath, fixtureProjectName),
      path.join(basePath, tmpProjectPath),
      {
        recursive: true,
        force: true,
      },
    );

    prevWorkingDir = process.cwd();
    process.chdir(path.join(basePath, tmpProjectPath));
  });

  after(async () => {
    process.chdir(prevWorkingDir);
    await remove(path.join(basePath, tmpProjectPath));
  });
}

export function useEphemeralIgnitionProject(fixtureProjectName: string): void {
  let projectPath: string;
  let prevWorkingDir: string;

  beforeEach("Load environment", async function () {
    projectPath = path.join(
      __dirname,
      "../fixture-projects",
      fixtureProjectName,
    );
    prevWorkingDir = process.cwd();
    process.chdir(projectPath);

    const configPath = path.join(projectPath, "hardhat.config.js");
    const { default: userConfig } = await import(
      pathToFileURL(configPath).href
    );

    const hre = await createHardhatRuntimeEnvironment(
      {
        ...userConfig,
        plugins: [
          ...(userConfig.plugins ?? []),
          hardhatIgnition,
          hardhatNetworkHelpers,
        ],
      },
      { config: configPath },
      projectPath,
    );

    const connection = await hre.network.connect();

    await connection.provider.request({
      method: "evm_setAutomine",
      params: [true],
    });

    const compileTask = hre.tasks.getTask("compile");
    await compileTask.run({ quiet: true });

    this.hre = hre;
    this.connection = connection;
    this.ignition = new TestIgnitionHelper(hre, connection);
    this.deploymentDir = undefined;
  });

  afterEach("reset hardhat context", function () {
    process.chdir(prevWorkingDir);
  });
}

export function useFileIgnitionProject(
  fixtureProjectName: string,
  deploymentId: string,
  config?: Partial<DeployConfig>,
): void {
  let projectPath: string;
  let prevWorkingDir: string;

  beforeEach("Load environment", async function () {
    projectPath = path.join(
      __dirname,
      "../fixture-projects",
      fixtureProjectName,
    );
    prevWorkingDir = process.cwd();
    process.chdir(projectPath);

    const configPath = path.join(projectPath, "hardhat.config.js");
    const { default: userConfig } = await import(
      pathToFileURL(configPath).href
    );

    const hre = await createHardhatRuntimeEnvironment(
      {
        ...userConfig,
        plugins: [
          ...(userConfig.plugins ?? []),
          hardhatIgnition,
          hardhatNetworkHelpers,
        ],
      },
      { config: configPath },
      projectPath,
    );

    const deploymentDir = path.join(
      projectPath,
      "ignition",
      "deployments",
      deploymentId,
    );

    const connection = await hre.network.connect();

    await connection.provider.request({
      method: "evm_setAutomine",
      params: [false],
    });

    this.hre = hre;
    this.connection = connection;
    this.ignition = new TestIgnitionHelper(hre, connection);
    this.deploymentDir = deploymentDir;

    const compileTask = hre.tasks.getTask("compile");
    await compileTask.run({ quiet: true });

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
        { hre, connection, config: testConfig },
        chainUpdates,
      );
    };
  });

  afterEach("reset hardhat context", async function () {
    if (this.deploymentDir === undefined) {
      throw new Error(
        "Deployment dir not set during cleanup of file based project",
      );
    }

    await remove(this.deploymentDir);

    process.chdir(prevWorkingDir);
  });
}

async function runDeploy(
  deploymentDir: string,
  ignitionModule: IgnitionModule,
  {
    hre,
    connection,
    config = {},
  }: {
    hre: HardhatRuntimeEnvironment;
    connection: NetworkConnection;
    config?: Partial<DeployConfig>;
  },
  chainUpdates: (c: TestChainHelper) => Promise<void> = async () => {},
): Promise<ReturnType<TestIgnitionHelper["deploy"]>> {
  const { ignitionHelper, kill: killFn } = setupIgnitionHelperRiggedToThrow(
    hre,
    connection,
    deploymentDir,
    config,
  );

  try {
    const deployPromise = ignitionHelper.deploy(ignitionModule, {
      config,
    });

    const chainHelper = new TestChainHelper(connection, deployPromise, killFn);

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
  connection: NetworkConnection,
  deploymentDir: string,
  config: Partial<DeployConfig> = {},
): {
  ignitionHelper: TestIgnitionHelper;
  kill: () => void;
} {
  const proxiedProvider = new ProxyProvider(connection.provider);

  const kill = () => {
    proxiedProvider.trigger = true;
  };

  const ignitionHelper = new TestIgnitionHelper(
    hre,
    connection,
    config,
    proxiedProvider,
    deploymentDir,
  );

  return { ignitionHelper, kill };
}

export class TestChainHelper {
  constructor(
    private readonly _connection: NetworkConnection,
    private readonly _deployPromise: Promise<any>,
    private readonly _exitFn: () => void,
  ) {}

  public async waitForPendingTxs(expectedCount: number): Promise<void> {
    await waitForPendingTxs(
      this._connection,
      expectedCount,
      this._deployPromise,
    );
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
      await waitForPendingTxs(
        this._connection,
        pendingTxToAwait,
        this._deployPromise,
      );
    }

    return mineBlock(this._connection);
  }

  public async clearMempool(pendingTxToAwait: number = 0): Promise<void> {
    if (pendingTxToAwait > 0) {
      await waitForPendingTxs(
        this._connection,
        pendingTxToAwait,
        this._deployPromise,
      );
    }

    return clearPendingTransactionsFromMemoryPool(this._connection);
  }

  public async setNextBlockBaseFeePerGas(fee: bigint): Promise<void> {
    return this._connection.networkHelpers.setNextBlockBaseFeePerGas(fee);
  }

  /**
   * Exit from the deploy on the next block tick.
   */
  public exitDeploy(): void {
    this._exitFn();
  }
}

class ProxyProvider extends EventEmitter implements EthereumProvider {
  public trigger: boolean;
  readonly #provider: EthereumProvider;

  constructor(provider: EthereumProvider) {
    super();
    this.trigger = false;
    this.#provider = provider;
  }

  public async request(requestArguments: RequestArguments): Promise<any> {
    if (this.trigger) {
      this.trigger = false;
      throw new Error("Killing deploy process");
    }

    return this.#provider.request(requestArguments);
  }

  public async close(): Promise<void> {
    if (this.trigger) {
      this.trigger = false;
      throw new Error("Killing deploy process");
    }

    return this.#provider.close();
  }

  public async send(method: string, params?: unknown[]): Promise<any> {
    if (this.trigger) {
      this.trigger = false;
      throw new Error("Killing deploy process");
    }

    return this.#provider.send(method, params);
  }

  public async sendAsync(jsonRpcRequest: any, callback: any): Promise<any> {
    if (this.trigger) {
      this.trigger = false;
      throw new Error("Killing deploy process");
    }

    return this.#provider.sendAsync(jsonRpcRequest, callback);
  }
}
