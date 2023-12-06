import {
  HardhatArtifactResolver,
  errorDeploymentResultToExceptionMessage,
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
  SuccessfulDeploymentResult,
  deploy,
  isContractFuture,
} from "@nomicfoundation/ignition-core";
import { Contract } from "ethers";
import { HardhatPluginError } from "hardhat/plugins";
import { HardhatRuntimeEnvironment } from "hardhat/types";

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
  private _deploymentDir: string | undefined;

  constructor(
    private _hre: HardhatRuntimeEnvironment,
    private _config?: Partial<DeployConfig>,
    provider?: EIP1193Provider,
    deploymentDir?: string
  ) {
    this._provider = provider ?? this._hre.network.provider;
    this._deploymentDir = deploymentDir;
  }

  public async deploy<
    ModuleIdT extends string,
    ContractNameT extends string,
    IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>
  >(
    ignitionModule: IgnitionModule<
      ModuleIdT,
      ContractNameT,
      IgnitionModuleResultsT
    >,
    {
      parameters = {},
      config: perDeployConfig = {},
    }: {
      parameters?: DeploymentParameters;
      config?: Partial<DeployConfig>;
    } = {
      parameters: {},
      config: {},
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

    const result = await deploy({
      config: resolvedConfig,
      provider: this._provider,
      deploymentDir: this._deploymentDir,
      artifactResolver,
      ignitionModule,
      deploymentParameters: parameters,
      accounts,
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
}
