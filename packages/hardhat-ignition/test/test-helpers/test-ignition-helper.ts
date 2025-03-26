import {
  deploy,
  DeployConfig,
  DeploymentParameters,
  DeploymentResultType,
  EIP1193Provider,
  Future,
  IgnitionModule,
  IgnitionModuleResult,
  isContractFuture,
  StrategyConfig,
  SuccessfulDeploymentResult,
} from "@nomicfoundation/ignition-core";
import { HardhatPluginError } from "hardhat/plugins";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import {
  createPublicClient,
  custom,
  getContract,
  GetContractReturnType,
} from "viem";
import { hardhat } from "viem/chains";

import { HardhatArtifactResolver } from "../../src/hardhat-artifact-resolver";
import { errorDeploymentResultToExceptionMessage } from "../../src/utils/error-deployment-result-to-exception-message";

export type IgnitionModuleResultsTToViemContracts<
  ContractNameT extends string,
  IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>
> = {
  [contract in keyof IgnitionModuleResultsT]: TypeChainViemContractByName;
};

// TODO: This is a very permissive type to maintain the existing tests.
// We should work it up to the equivalent of the Viem Ignition helper.
// That implies solving how we get post compile type information for contracts.
export interface TypeChainViemContractByName {
  address: string;
  read: any;
  write: any;
}

export class TestIgnitionHelper {
  public type = "test";

  #hre: HardhatRuntimeEnvironment;
  #config?: Partial<DeployConfig>;
  #provider: EIP1193Provider;
  #deploymentDir: string | undefined;

  constructor(
    hre: HardhatRuntimeEnvironment,
    config?: Partial<DeployConfig>,
    provider?: EIP1193Provider,
    deploymentDir?: string
  ) {
    this.#hre = hre;
    this.#config = config;
    this.#provider = provider ?? this.#hre.network.provider;
    this.#deploymentDir = deploymentDir;
  }

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
      strategy: strategyName,
      strategyConfig,
      defaultSender = undefined,
    }: {
      parameters?: DeploymentParameters;
      config?: Partial<DeployConfig>;
      strategy?: StrategyT;
      strategyConfig?: StrategyConfig[StrategyT];
      defaultSender?: string;
    } = {
      parameters: {},
      config: {},
    }
  ): Promise<
    IgnitionModuleResultsTToViemContracts<ContractNameT, IgnitionModuleResultsT>
  > {
    const accounts = (await this.#hre.network.provider.request({
      method: "eth_accounts",
    })) as string[];

    const artifactResolver = new HardhatArtifactResolver(this.#hre);

    const resolvedConfig: Partial<DeployConfig> = {
      ...this.#config,
      ...perDeployConfig,
    };

    const result = await deploy({
      config: resolvedConfig,
      provider: this.#provider,
      deploymentDir: this.#deploymentDir,
      artifactResolver,
      ignitionModule,
      deploymentParameters: parameters,
      accounts,
      defaultSender,
      strategy: strategyName,
      strategyConfig,
    });

    if (result.type !== DeploymentResultType.SUCCESSFUL_DEPLOYMENT) {
      const message = errorDeploymentResultToExceptionMessage(result);

      throw new HardhatPluginError("hardhat-ignition-test", message);
    }

    const publicClient = createPublicClient({
      chain: hardhat,
      transport: custom(this.#hre.network.provider),
    });

    return this._toViemContracts(
      this.#hre,
      ignitionModule,
      result,
      publicClient
    );
  }

  private async _toViemContracts<
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
    result: SuccessfulDeploymentResult,
    publicClient: any
  ): Promise<
    IgnitionModuleResultsTToViemContracts<ContractNameT, IgnitionModuleResultsT>
  > {
    return Object.fromEntries(
      await Promise.all(
        Object.entries(ignitionModule.results).map(
          async ([name, contractFuture]) => [
            name,
            await this._getContract(
              hre,
              contractFuture,
              result.contracts[contractFuture.id],
              publicClient
            ),
          ]
        )
      )
    );
  }

  private async _getContract(
    hre: HardhatRuntimeEnvironment,
    future: Future,
    deployedContract: { address: string; contractName: string },
    publicClient: any
  ): Promise<GetContractReturnType> {
    if (!isContractFuture(future)) {
      throw new HardhatPluginError(
        "hardhat-ignition-viem",
        `Expected contract future but got ${future.id} with type ${future.type} instead`
      );
    }

    const contract: any = getContract({
      address: this._ensureAddressFormat(deployedContract.address),
      abi: await this._loadAbiFromHHArtifactFolder(
        hre,
        deployedContract.contractName
      ),
      client: { public: publicClient },
    });

    return contract;
  }

  private _ensureAddressFormat(address: string): `0x${string}` {
    if (!address.startsWith("0x")) {
      return `0x${address}`;
    }

    return `0x${address.slice(2)}`;
  }

  private async _loadAbiFromHHArtifactFolder(
    hre: HardhatRuntimeEnvironment,
    contractName: string
  ): Promise<any[]> {
    const artifact = await hre.artifacts.readArtifact(contractName);

    if (artifact === undefined) {
      throw new Error(
        `Test error: no hardcoded abi for contract ${contractName}`
      );
    }

    return artifact.abi;
  }
}
