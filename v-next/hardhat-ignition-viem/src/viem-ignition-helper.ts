import type { IgnitionModuleResultsToViemContracts } from "./ignition-module-results-to-viem-contracts.js";
import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";
import type { NetworkConnection } from "@ignored/hardhat-vnext/types/network";
import type {
  ContractAtFuture,
  ContractDeploymentFuture,
  ContractFuture,
  DeployConfig,
  DeploymentParameters,
  EIP1193Provider,
  Future,
  IgnitionModule,
  IgnitionModuleResult,
  LibraryDeploymentFuture,
  NamedArtifactContractAtFuture,
  NamedArtifactContractDeploymentFuture,
  NamedArtifactLibraryDeploymentFuture,
  StrategyConfig,
  SuccessfulDeploymentResult,
} from "@ignored/hardhat-vnext-ignition-core";
import type { GetContractReturnType } from "@ignored/hardhat-vnext-viem/types";

import path from "node:path";

import { HardhatPluginError } from "@ignored/hardhat-vnext-errors";
import {
  HardhatArtifactResolver,
  PrettyEventHandler,
  errorDeploymentResultToExceptionMessage,
  readDeploymentParameters,
  resolveDeploymentId,
} from "@ignored/hardhat-vnext-ignition/helpers";
import {
  DeploymentResultType,
  FutureType,
  deploy,
  isContractFuture,
} from "@ignored/hardhat-vnext-ignition-core";

export class ViemIgnitionHelper {
  public type = "viem";

  readonly #hre: HardhatRuntimeEnvironment;
  readonly #connection: NetworkConnection;
  readonly #config: Partial<DeployConfig> | undefined;
  readonly #provider: EIP1193Provider;

  constructor(
    hre: HardhatRuntimeEnvironment,
    connection: NetworkConnection,
    config?: Partial<DeployConfig> | undefined,
    provider?: EIP1193Provider,
  ) {
    this.#hre = hre;
    this.#connection = connection;
    this.#config = config;
    this.#provider = provider ?? this.#connection.provider;
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
    IgnitionModuleResultsToViemContracts<ContractNameT, IgnitionModuleResultsT>
  > {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- eth_accounts returns a string array
    const accounts: string[] = (await this.#connection.provider.request({
      method: "eth_accounts",
    })) as string[];

    const artifactResolver = new HardhatArtifactResolver(this.#hre);

    const resolvedConfig: Partial<DeployConfig> = {
      ...this.#config,
      ...perDeployConfig,
    };

    const resolvedStrategyConfig =
      ViemIgnitionHelper.#resolveStrategyConfig<StrategyT>(
        this.#hre,
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
      this.#connection.networkName === "hardhat"
        ? undefined
        : path.join(
            this.#hre.config.paths.ignition,
            "deployments",
            deploymentId,
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
        this.#hre.config.networks[this.#connection.networkName]?.ignition
          .maxFeePerGasLimit,
      maxPriorityFeePerGas:
        this.#hre.config.networks[this.#connection.networkName]?.ignition
          .maxPriorityFeePerGas,
    });

    if (result.type !== DeploymentResultType.SUCCESSFUL_DEPLOYMENT) {
      const message = errorDeploymentResultToExceptionMessage(result);

      // eslint-disable-next-line no-restricted-syntax -- TODO: HH3 revisit the error handling
      throw new HardhatPluginError("hardhat-ignition-viem", message);
    }

    return ViemIgnitionHelper.#toViemContracts(
      this.#connection,
      ignitionModule,
      result,
    );
  }

  static async #toViemContracts<
    ModuleIdT extends string,
    ContractNameT extends string,
    IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>,
  >(
    connection: NetworkConnection,
    ignitionModule: IgnitionModule<
      ModuleIdT,
      ContractNameT,
      IgnitionModuleResultsT
    >,
    result: SuccessfulDeploymentResult,
  ): Promise<
    IgnitionModuleResultsToViemContracts<ContractNameT, IgnitionModuleResultsT>
  > {
    return Object.fromEntries(
      await Promise.all(
        Object.entries(ignitionModule.results).map(
          async ([name, contractFuture]) => [
            name,
            await ViemIgnitionHelper.#getContract(
              connection,
              contractFuture,
              result.contracts[contractFuture.id],
            ),
          ],
        ),
      ),
    );
  }

  static async #getContract(
    connection: NetworkConnection,
    future: Future,
    deployedContract: { address: string },
  ): Promise<GetContractReturnType> {
    if (!isContractFuture(future)) {
      // eslint-disable-next-line no-restricted-syntax -- TODO: HH3 revisit the error handling
      throw new HardhatPluginError(
        "hardhat-ignition-viem",
        `Expected contract future but got ${future.id} with type ${future.type} instead`,
      );
    }

    return ViemIgnitionHelper.#convertContractFutureToViemContract(
      connection,
      future,
      deployedContract,
    );
  }

  static async #convertContractFutureToViemContract(
    connection: NetworkConnection,
    future: ContractFuture<string>,
    deployedContract: { address: string },
  ) {
    switch (future.type) {
      case FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT:
      case FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT:
      case FutureType.NAMED_ARTIFACT_CONTRACT_AT:
        return ViemIgnitionHelper.#convertHardhatContractToViemContract(
          connection,
          future,
          deployedContract,
        );
      case FutureType.CONTRACT_DEPLOYMENT:
      case FutureType.LIBRARY_DEPLOYMENT:
      case FutureType.CONTRACT_AT:
        return ViemIgnitionHelper.#convertArtifactToViemContract(
          connection,
          future,
          deployedContract,
        );
    }
  }

  static #convertHardhatContractToViemContract(
    connection: NetworkConnection,
    future:
      | NamedArtifactContractDeploymentFuture<string>
      | NamedArtifactLibraryDeploymentFuture<string>
      | NamedArtifactContractAtFuture<string>,
    deployedContract: { address: string },
  ): Promise<GetContractReturnType> {
    return connection.viem.getContractAt(
      future.contractName,
      ViemIgnitionHelper.#ensureAddressFormat(deployedContract.address),
    );
  }

  static async #convertArtifactToViemContract(
    connection: NetworkConnection,
    future:
      | ContractDeploymentFuture
      | LibraryDeploymentFuture
      | ContractAtFuture,
    deployedContract: { address: string },
  ): Promise<GetContractReturnType> {
    const publicClient = await connection.viem.getPublicClient();
    const [walletClient] = await connection.viem.getWalletClients();

    if (walletClient === undefined) {
      // eslint-disable-next-line no-restricted-syntax -- TODO: HH3 revisit the error handling
      throw new HardhatPluginError(
        "hardhat-ignition-viem",
        "No default wallet client found",
      );
    }

    const viem = await import("viem");
    const contract = viem.getContract({
      address: ViemIgnitionHelper.#ensureAddressFormat(
        deployedContract.address,
      ),
      abi: future.artifact.abi,
      client: {
        public: publicClient,
        wallet: walletClient,
      },
    });

    return contract;
  }

  static #ensureAddressFormat(address: string): `0x${string}` {
    if (!address.startsWith("0x")) {
      return `0x${address}`;
    }

    return `0x${address.slice(2)}`;
  }

  static #resolveStrategyConfig<StrategyT extends keyof StrategyConfig>(
    hre: HardhatRuntimeEnvironment,
    strategyName: StrategyT | undefined,
    strategyConfig: StrategyConfig[StrategyT] | undefined,
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
