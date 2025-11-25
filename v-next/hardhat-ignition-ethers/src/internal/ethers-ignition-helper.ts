import "@nomicfoundation/hardhat-ethers";
import type {
  EthersIgnitionHelper,
  IgnitionModuleResultsTToEthersContracts,
} from "../types.js";
import type {
  DeployConfig,
  DeploymentParameters,
  EIP1193Provider,
  Future,
  IgnitionModule,
  IgnitionModuleResult,
  StrategyConfig,
  SuccessfulDeploymentResult,
} from "@nomicfoundation/ignition-core";
import type { Contract } from "ethers";
import type { ArtifactManager } from "hardhat/types/artifacts";
import type { HardhatConfig } from "hardhat/types/config";
import type { ChainType, NetworkConnection } from "hardhat/types/network";
import type { UserInterruptionManager } from "hardhat/types/user-interruptions";
import "@nomicfoundation/hardhat-ignition";

import path from "node:path";

import {
  HardhatError,
  assertHardhatInvariant,
} from "@nomicfoundation/hardhat-errors";
import {
  HardhatArtifactResolver,
  PrettyEventHandler,
  errorDeploymentResultToExceptionMessage,
  readDeploymentParameters,
  resolveDeploymentId,
} from "@nomicfoundation/hardhat-ignition/helpers";
import {
  DeploymentResultType,
  deploy,
  isContractFuture,
} from "@nomicfoundation/ignition-core";

export class EthersIgnitionHelperImpl<ChainTypeT extends ChainType | string>
  implements EthersIgnitionHelper
{
  public type: "ethers" = "ethers";

  readonly #hardhatConfig: HardhatConfig;
  readonly #artifactsManager: ArtifactManager;
  readonly #connection: NetworkConnection<ChainTypeT>;
  readonly #config: Partial<DeployConfig> | undefined;
  readonly #provider: EIP1193Provider;
  readonly #userInterruptions: UserInterruptionManager;

  #mutex: boolean = false;

  constructor(
    hardhatConfig: HardhatConfig,
    artifactsManager: ArtifactManager,
    connection: NetworkConnection<ChainTypeT>,
    userInterruptions: UserInterruptionManager,
    config?: Partial<DeployConfig> | undefined,
    provider?: EIP1193Provider,
  ) {
    this.#hardhatConfig = hardhatConfig;
    this.#artifactsManager = artifactsManager;
    this.#connection = connection;
    this.#userInterruptions = userInterruptions;
    this.#config = config;
    this.#provider = provider ?? this.#connection.provider;
  }

  /**
   * Deploys the given Ignition module and returns the results of the module as
   * Ethers contract instances.
   *
   * @param ignitionModule - The Ignition module to deploy.
   * @param options - The options to use for the deployment.
   * @returns Ethers contract instances for each contract returned by the
   * module.
   */
  public async deploy<
    ModuleIdT extends string,
    ContractNameT extends string,
    IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>,
    StrategyT extends keyof StrategyConfig = "basic",
  >(
    ignitionModule: IgnitionModule<
      ModuleIdT,
      ContractNameT,
      IgnitionModuleResultsT
    >,
    {
      parameters = {},
      config: perDeployConfig = {},
      defaultSender = undefined,
      strategy,
      strategyConfig,
      deploymentId: givenDeploymentId = undefined,
      displayUi = false,
    }: {
      parameters?: DeploymentParameters | string;
      config?: Partial<DeployConfig>;
      defaultSender?: string;
      strategy?: StrategyT;
      strategyConfig?: StrategyConfig[StrategyT];
      deploymentId?: string;
      displayUi?: boolean;
    } = {
      parameters: {},
      config: {},
      defaultSender: undefined,
      strategy: undefined,
      strategyConfig: undefined,
      deploymentId: undefined,
      displayUi: undefined,
    },
  ): Promise<
    IgnitionModuleResultsTToEthersContracts<
      ContractNameT,
      IgnitionModuleResultsT
    >
  > {
    if (this.#mutex) {
      throw new HardhatError(
        HardhatError.ERRORS.IGNITION.DEPLOY.ALREADY_IN_PROGRESS,
      );
    }

    this.#mutex = true;

    try {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- eth_accounts returns a string array
      const accounts: string[] = (await this.#connection.provider.request({
        method: "eth_accounts",
      })) as string[];

      const artifactResolver = new HardhatArtifactResolver(
        this.#artifactsManager,
      );

      const resolvedConfig: Partial<DeployConfig> =
        this.getResolvedConfig(perDeployConfig);

      const resolvedStrategyConfig = this.#resolveStrategyConfig<StrategyT>(
        this.#hardhatConfig,
        strategy,
        strategyConfig,
      );

      const chainId = Number(
        await this.#connection.provider.request({
          method: "eth_chainId",
        }),
      );

      const deploymentId = resolveDeploymentId(givenDeploymentId, chainId);

      const deploymentDir =
        this.#connection.networkConfig.type === "edr-simulated"
          ? undefined
          : path.join(
              this.#hardhatConfig.paths.ignition,
              "deployments",
              deploymentId,
            );

      const executionEventListener = displayUi
        ? new PrettyEventHandler(this.#userInterruptions)
        : undefined;

      let deploymentParameters: DeploymentParameters;

      if (typeof parameters === "string") {
        deploymentParameters = await readDeploymentParameters(parameters);
      } else {
        deploymentParameters = parameters;
      }

      const result = await deploy({
        config: resolvedConfig,
        provider: this.#provider,
        deploymentDir,
        executionEventListener,
        artifactResolver,
        ignitionModule,
        deploymentParameters,
        accounts,
        defaultSender,
        strategy,
        strategyConfig: resolvedStrategyConfig,
        maxFeePerGasLimit:
          this.#connection.networkConfig?.ignition.maxFeePerGasLimit,
        maxPriorityFeePerGas:
          this.#connection.networkConfig?.ignition.maxPriorityFeePerGas,
      });

      if (result.type !== DeploymentResultType.SUCCESSFUL_DEPLOYMENT) {
        const message = errorDeploymentResultToExceptionMessage(result);

        throw new HardhatError(
          HardhatError.ERRORS.IGNITION.INTERNAL.DEPLOYMENT_ERROR,
          {
            message,
          },
        );
      }

      return await this.#toEthersContracts(
        this.#connection,
        ignitionModule,
        result,
      );
    } finally {
      this.#mutex = false;
    }
  }

  public getResolvedConfig(
    perDeployConfig: Partial<DeployConfig>,
  ): Partial<DeployConfig> {
    return {
      ...this.#config,
      ...perDeployConfig,
    };
  }

  async #toEthersContracts<
    ModuleIdT extends string,
    ContractNameT extends string,
    IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>,
  >(
    connection: NetworkConnection<ChainTypeT>,
    ignitionModule: IgnitionModule<
      ModuleIdT,
      ContractNameT,
      IgnitionModuleResultsT
    >,
    result: SuccessfulDeploymentResult,
  ): Promise<
    IgnitionModuleResultsTToEthersContracts<
      ContractNameT,
      IgnitionModuleResultsT
    >
  > {
    return Object.fromEntries(
      await Promise.all(
        Object.entries(ignitionModule.results).map(
          async ([name, contractFuture]) => [
            name,
            await this.#getContract(
              connection,
              contractFuture,
              result.contracts[contractFuture.id],
            ),
          ],
        ),
      ),
    );
  }

  async #getContract(
    connection: NetworkConnection<ChainTypeT>,
    future: Future,
    deployedContract: { address: string },
  ): Promise<Contract> {
    assertHardhatInvariant(
      isContractFuture(future),
      `Expected contract future but got ${future.id} with type ${future.type} instead`,
    );

    if ("artifact" in future) {
      return connection.ethers.getContractAt(
        // The abi meets the abi spec and we assume we can convert to
        // an acceptable Ethers abi
        future.artifact.abi,
        deployedContract.address,
      );
    }

    return connection.ethers.getContractAt(
      future.contractName,
      deployedContract.address,
    );
  }

  #resolveStrategyConfig<StrategyT extends keyof StrategyConfig>(
    hardhatConfig: HardhatConfig,
    strategyName: StrategyT | undefined,
    strategyConfig: StrategyConfig[StrategyT] | undefined,
  ): StrategyConfig[StrategyT] | undefined {
    if (strategyName === undefined) {
      return undefined;
    }

    if (strategyConfig === undefined) {
      const fromHardhatConfig =
        hardhatConfig.ignition?.strategyConfig?.[strategyName];

      return fromHardhatConfig;
    }

    return strategyConfig;
  }
}
