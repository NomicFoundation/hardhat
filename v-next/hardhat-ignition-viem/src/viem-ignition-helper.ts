import type { GetContractReturnType } from "@ignored/hardhat-vnext-viem/types";

import {
  HardhatArtifactResolver,
  PrettyEventHandler,
  errorDeploymentResultToExceptionMessage,
  readDeploymentParameters,
  resolveDeploymentId,
} from "@ignored/hardhat-vnext-ignition/helpers";
import {
  ContractAtFuture,
  ContractDeploymentFuture,
  ContractFuture,
  DeployConfig,
  DeploymentParameters,
  DeploymentResultType,
  EIP1193Provider,
  Future,
  FutureType,
  IgnitionModule,
  IgnitionModuleResult,
  LibraryDeploymentFuture,
  NamedArtifactContractAtFuture,
  NamedArtifactContractDeploymentFuture,
  NamedArtifactLibraryDeploymentFuture,
  StrategyConfig,
  SuccessfulDeploymentResult,
  deploy,
  isContractFuture,
} from "@ignored/hardhat-vnext-ignition-core";

import path from "path";

import { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";
import { NetworkConnection } from "@ignored/hardhat-vnext/types/network";
import { HardhatPluginError } from "@ignored/hardhat-vnext-errors";
import { IgnitionModuleResultsToViemContracts } from "./ignition-module-results-to-viem-contracts.js";

export class ViemIgnitionHelper {
  public type = "viem";

  private _provider: EIP1193Provider;

  constructor(
    private _hre: HardhatRuntimeEnvironment,
    private _connection: NetworkConnection,
    private _config?: Partial<DeployConfig> | undefined,
    provider?: EIP1193Provider
  ) {
    this._provider = provider ?? this._connection.provider;
  }

  /**
   * Deploys the given Ignition module and returns the results of the module
   * as Viem contract instances.
   *
   * @param ignitionModule - The Ignition module to deploy.
   * @param options - The options to use for the deployment.
   * @returns Viem contract instances for each contract returned by the module.
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
    IgnitionModuleResultsToViemContracts<ContractNameT, IgnitionModuleResultsT>
  > {
    const accounts = (await this._connection.provider.request({
      method: "eth_accounts",
    })) as string[];

    const artifactResolver = new HardhatArtifactResolver(this._hre);

    const resolvedConfig: Partial<DeployConfig> = {
      ...this._config,
      ...perDeployConfig,
    };

    const resolvedStrategyConfig =
      ViemIgnitionHelper._resolveStrategyConfig<StrategyT>(
        this._hre,
        strategy,
        strategyConfig
      );

    const chainId = Number(
      await this._connection.provider.request({
        method: "eth_chainId",
      })
    );

    const deploymentId = resolveDeploymentId(givenDeploymentId, chainId);

    const deploymentDir =
      this._connection.networkName === "hardhat"
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
        this._hre.config.networks[this._connection.networkName]?.ignition
          .maxFeePerGasLimit,
      maxPriorityFeePerGas:
        this._hre.config.networks[this._connection.networkName]?.ignition
          .maxPriorityFeePerGas,
    });

    if (result.type !== DeploymentResultType.SUCCESSFUL_DEPLOYMENT) {
      const message = errorDeploymentResultToExceptionMessage(result);

      throw new HardhatPluginError("hardhat-ignition-viem", message);
    }

    return ViemIgnitionHelper._toViemContracts(
      this._connection,
      ignitionModule,
      result
    );
  }

  private static async _toViemContracts<
    ModuleIdT extends string,
    ContractNameT extends string,
    IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>
  >(
    connection: NetworkConnection,
    ignitionModule: IgnitionModule<
      ModuleIdT,
      ContractNameT,
      IgnitionModuleResultsT
    >,
    result: SuccessfulDeploymentResult
  ): Promise<
    IgnitionModuleResultsToViemContracts<ContractNameT, IgnitionModuleResultsT>
  > {
    return Object.fromEntries(
      await Promise.all(
        Object.entries(ignitionModule.results).map(
          async ([name, contractFuture]) => [
            name,
            await ViemIgnitionHelper._getContract(
              connection,
              contractFuture,
              result.contracts[contractFuture.id]
            ),
          ]
        )
      )
    );
  }

  private static async _getContract(
    connection: NetworkConnection,
    future: Future,
    deployedContract: { address: string }
  ): Promise<GetContractReturnType> {
    if (!isContractFuture(future)) {
      throw new HardhatPluginError(
        "hardhat-ignition-viem",
        `Expected contract future but got ${future.id} with type ${future.type} instead`
      );
    }

    return ViemIgnitionHelper._convertContractFutureToViemContract(
      connection,
      future,
      deployedContract
    );
  }

  private static async _convertContractFutureToViemContract(
    connection: NetworkConnection,
    future: ContractFuture<string>,
    deployedContract: { address: string }
  ) {
    switch (future.type) {
      case FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT:
      case FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT:
      case FutureType.NAMED_ARTIFACT_CONTRACT_AT:
        return ViemIgnitionHelper._convertHardhatContractToViemContract(
          connection,
          future,
          deployedContract
        );
      case FutureType.CONTRACT_DEPLOYMENT:
      case FutureType.LIBRARY_DEPLOYMENT:
      case FutureType.CONTRACT_AT:
        return ViemIgnitionHelper._convertArtifactToViemContract(
          connection,
          future,
          deployedContract
        );
    }
  }

  private static _convertHardhatContractToViemContract(
    connection: NetworkConnection,
    future:
      | NamedArtifactContractDeploymentFuture<string>
      | NamedArtifactLibraryDeploymentFuture<string>
      | NamedArtifactContractAtFuture<string>,
    deployedContract: { address: string }
  ): Promise<GetContractReturnType> {
    return connection.viem.getContractAt(
      future.contractName,
      ViemIgnitionHelper._ensureAddressFormat(deployedContract.address)
    );
  }

  private static async _convertArtifactToViemContract(
    connection: NetworkConnection,
    future:
      | ContractDeploymentFuture
      | LibraryDeploymentFuture
      | ContractAtFuture,
    deployedContract: { address: string }
  ): Promise<GetContractReturnType> {
    const publicClient = await connection.viem.getPublicClient();
    const [walletClient] = await connection.viem.getWalletClients();

    if (walletClient === undefined) {
      throw new HardhatPluginError(
        "hardhat-ignition-viem",
        "No default wallet client found"
      );
    }

    const viem = await import("viem");
    const contract = viem.getContract({
      address: ViemIgnitionHelper._ensureAddressFormat(
        deployedContract.address
      ),
      abi: future.artifact.abi,
      client: {
        public: publicClient,
        wallet: walletClient,
      },
    });

    return contract;
  }

  private static _ensureAddressFormat(address: string): `0x${string}` {
    if (!address.startsWith("0x")) {
      return `0x${address}`;
    }

    return `0x${address.slice(2)}`;
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
