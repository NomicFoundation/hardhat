import {
  DeployConfig,
  IgnitionModuleDefinition,
  IgnitionModuleResult,
  ModuleParameters,
} from "@ignored/ignition-core";
import { Contract } from "ethers";
import fs from "fs-extra";
import { resetHardhatContext } from "hardhat/plugins-testing";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import path from "path";

import { buildAdaptersFrom } from "../src/buildAdaptersFrom";
import { IgnitionHelper } from "../src/ignition-helper";

import { clearPendingTransactionsFromMemoryPool } from "./execution/helpers";
import { waitForPendingTxs } from "./helpers";

export function useEphemeralIgnitionProject(
  fixtureProjectName: string,
  config?: Partial<DeployConfig>
) {
  beforeEach("Load environment", async function () {
    process.chdir(
      path.join(__dirname, "./fixture-projects", fixtureProjectName)
    );

    const hre = require("hardhat");

    await hre.network.provider.send("evm_setAutomine", [true]);

    this.hre = hre;
    this.deploymentDir = undefined;

    await hre.run("compile", { quiet: true });

    const testConfig: Partial<DeployConfig> = {
      transactionTimeoutInterval: 1000,
      ...config,
    };

    this.config = testConfig;

    this.deploy = (
      moduleDefinition: IgnitionModuleDefinition<
        string,
        string,
        IgnitionModuleResult<string>
      >,
      parameters: { [key: string]: ModuleParameters } = {}
    ) => {
      return this.hre.ignition2.deploy(moduleDefinition, {
        parameters,
      });
    };
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
      path.join(__dirname, "./fixture-projects", fixtureProjectName)
    );

    const hre = require("hardhat");

    const deploymentDir = path.join(
      path.resolve(__dirname, "./fixture-projects/minimal-new-api/"),
      "deployments",
      deploymentId
    );

    this.hre = hre;
    this.deploymentDir = deploymentDir;

    await hre.run("compile", { quiet: true });

    const testConfig: Partial<DeployConfig> = {
      transactionTimeoutInterval: 1000,
      ...config,
    };

    this.config = testConfig;

    fs.ensureDirSync(deploymentDir);

    this.deploy = (
      moduleDefinition: IgnitionModuleDefinition<
        string,
        string,
        IgnitionModuleResult<string>
      >,
      chainUpdates: (c: TestChainHelper) => Promise<void> = async () => {}
    ) => {
      return runDeploy(
        deploymentDir,
        moduleDefinition,
        { hre, config: testConfig },
        chainUpdates
      );
    };
  });

  afterEach("reset hardhat context", function () {
    resetHardhatContext();

    fs.removeSync(this.deploymentDir);
  });
}

async function runDeploy(
  deploymentDir: string,
  moduleDefinition: IgnitionModuleDefinition<
    string,
    string,
    IgnitionModuleResult<string>
  >,
  {
    hre,
    config,
  }: { hre: HardhatRuntimeEnvironment; config?: Partial<DeployConfig> },
  chainUpdates: (c: TestChainHelper) => Promise<void> = async () => {}
): Promise<Record<string, Contract>> {
  const { ignitionHelper: ignitionHelper, kill: killFn } =
    setupIgnitionHelperRiggedToThrow(hre, deploymentDir, config);

  try {
    const deployPromise = ignitionHelper.deploy(moduleDefinition, {
      parameters: {},
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
  ignitionHelper: IgnitionHelper;
  kill: () => void;
} {
  const adapters = buildAdaptersFrom(hre);

  let trigger: boolean = false;

  const kill = () => {
    trigger = true;
  };

  const originalGetBlock = adapters.blocks.getBlock;

  adapters.blocks = {
    ...adapters.blocks,
    getBlock: async (): Promise<{ number: number; hash: string }> => {
      if (trigger) {
        trigger = false;
        throw new Error("Killing deploy process");
      }

      const block = await originalGetBlock();

      return block;
    },
  };

  const ignitionHelper = new IgnitionHelper(
    hre,
    config,
    adapters,
    deploymentDir
  );

  return { ignitionHelper, kill };
}

export class TestChainHelper {
  constructor(
    private _hre: HardhatRuntimeEnvironment,
    private _deployPromise: Promise<any>,
    private _exitFn: () => void
  ) {}

  public async waitForPendingTxs(expectedCount: number) {
    await waitForPendingTxs(this._hre, expectedCount, this._deployPromise);
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
      await waitForPendingTxs(this._hre, pendingTxToAwait, this._deployPromise);
    }

    return this._hre.network.provider.send("evm_mine");
  }

  public async clearMempool(pendingTxToAwait: number = 0) {
    if (pendingTxToAwait > 0) {
      await waitForPendingTxs(this._hre, pendingTxToAwait, this._deployPromise);
    }

    return clearPendingTransactionsFromMemoryPool(this._hre);
  }

  /**
   * Exit from the deploy on the next block tick.
   */
  public exitDeploy() {
    this._exitFn();
  }
}
