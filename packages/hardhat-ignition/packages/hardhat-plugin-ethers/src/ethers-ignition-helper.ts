import {
  HardhatArtifactResolver,
  PrettyEventHandler,
  errorDeploymentResultToExceptionMessage,
  readDeploymentParameters,
  resolveDeploymentId,
} from "@nomicfoundation/hardhat-ignition/helpers";
import {
  DeployConfig,
  DeploymentParameters,
  DeploymentResultType,
  EIP1193Provider,
  Future,
  IgnitionModule,
  IgnitionModuleResult,
  NamedArtifactContractAtFuture,
  NamedArtifactContractDeploymentFuture,
  StrategyConfig,
  SuccessfulDeploymentResult,
  deploy,
  isContractFuture,
} from "@nomicfoundation/ignition-core";
import { Contract } from "ethers";
import { HardhatPluginError } from "hardhat/plugins";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import path from "path";

export type IgnitionModuleResultsTToEthersContracts<
  ContractNameT extends string,
  IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>
> = {
  [contract in keyof IgnitionModuleResultsT]: IgnitionModuleResultsT[contract] extends
    | NamedArtifactContractDeploymentFuture<ContractNameT>
    | NamedArtifactContractAtFuture<ContractNameT>
    ? TypeChainEthersContractByName<ContractNameT>
    : Contract;
};

// TODO: Make this work to have support for TypeChain
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type TypeChainEthersContractByName<ContractNameT> = Contract;

export class EthersIgnitionHelper {
  public type = "ethers";

  private _provider: EIP1193Provider;

  constructor(
    private _hre: HardhatRuntimeEnvironment,
    private _config?: Partial<DeployConfig>,
    provider?: EIP1193Provider
  ) {
    this._provider = provider ?? this._hre.network.provider;
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
    StrategyT extends keyof StrategyConfig = "basic"
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
    }
  ): Promise<
    IgnitionModuleResultsTToEthersContracts<
      ContractNameT,
      IgnitionModuleResultsT
    >
  > {
    const accounts = (await this._hre.network.provider.request({
      method: "eth_accounts",
    })) as string[];

    const artifactResolver = new HardhatArtifactResolver(this._hre);

    const resolvedConfig: Partial<DeployConfig> = {
      ...this._config,
      ...perDeployConfig,
    };

    const resolvedStrategyConfig =
      EthersIgnitionHelper._resolveStrategyConfig<StrategyT>(
        this._hre,
        strategy,
        strategyConfig
      );

    const chainId = Number(
      await this._hre.network.provider.request({
        method: "eth_chainId",
      })
    );

    const deploymentId = resolveDeploymentId(givenDeploymentId, chainId);

    const deploymentDir =
      this._hre.network.name === "hardhat"
        ? undefined
        : path.join(
            this._hre.config.paths.ignition,
            "deployments",
            deploymentId
          );

    const executionEventListener = displayUi
      ? new PrettyEventHandler()
      : undefined;

    let deploymentParameters: DeploymentParameters;

    if (typeof parameters === "string") {
      deploymentParameters = await readDeploymentParameters(parameters);
    } else {
      deploymentParameters = parameters;
    }

    const result = await deploy({
      config: resolvedConfig,
      provider: this._provider,
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
        this._hre.config.networks[this._hre.network.name]?.ignition
          .maxFeePerGasLimit,
      maxPriorityFeePerGas:
        this._hre.config.networks[this._hre.network.name]?.ignition
          .maxPriorityFeePerGas,
    });

    if (result.type !== DeploymentResultType.SUCCESSFUL_DEPLOYMENT) {
      const message = errorDeploymentResultToExceptionMessage(result);

      throw new HardhatPluginError("hardhat-ignition-viem", message);
    }

    return EthersIgnitionHelper._toEthersContracts(
      this._hre,
      ignitionModule,
      result
    );
  }

  private static async _toEthersContracts<
    ModuleIdT extends string,
    ContractNameT extends string,
    IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>
  >(
    hre: HardhatRuntimeEnvironment,
    ignitionModule: IgnitionModule<
      ModuleIdT,
      ContractNameT,
      IgnitionModuleResultsT
    >,
    result: SuccessfulDeploymentResult
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
            await this._getContract(
              hre,
              contractFuture,
              result.contracts[contractFuture.id]
            ),
          ]
        )
      )
    );
  }

  private static async _getContract(
    hre: HardhatRuntimeEnvironment,
    future: Future,
    deployedContract: { address: string }
  ): Promise<Contract> {
    if (!isContractFuture(future)) {
      throw new HardhatPluginError(
        "hardhat-ignition",
        `Expected contract future but got ${future.id} with type ${future.type} instead`
      );
    }

    if ("artifact" in future) {
      return hre.ethers.getContractAt(
        // The abi meets the abi spec and we assume we can convert to
        // an acceptable Ethers abi
        future.artifact.abi as any[],
        deployedContract.address
      );
    }

    return hre.ethers.getContractAt(
      future.contractName,
      deployedContract.address
    );
  }

  private static _resolveStrategyConfig<StrategyT extends keyof StrategyConfig>(
    hre: HardhatRuntimeEnvironment,
    strategyName: StrategyT | undefined,
    strategyConfig: StrategyConfig[StrategyT] | undefined
  ): StrategyConfig[StrategyT] | undefined {
    if (strategyName === undefined) {
      return undefined;
    }

    if (strategyConfig === undefined) {
      const fromHardhatConfig =
        hre.config.ignition?.strategyConfig?.[strategyName];

      return fromHardhatConfig;
    }

    return strategyConfig;
  }
}
