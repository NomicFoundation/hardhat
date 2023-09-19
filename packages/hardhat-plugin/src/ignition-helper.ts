import type { Contract } from "ethers";

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
  NamedArtifactContractAtFuture,
  NamedArtifactContractDeploymentFuture,
  SuccessfulDeploymentResult,
} from "@nomicfoundation/ignition-core";
import { HardhatPluginError } from "hardhat/plugins";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { HardhatArtifactResolver } from "./hardhat-artifact-resolver";
import { errorDeploymentResultToExceptionMessage } from "./utils/error-deployment-result-to-exception-message";

export type DeployedContract<ContractNameT extends string> = {
  [contractName in ContractNameT]: Contract;
};

export class IgnitionHelper {
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

      // todo: should we implement an IgnitionPluginError to throw here instead?
      throw new Error(message);
    }

    return this._toEthersContracts(ignitionModule, result);
  }

  private async _toEthersContracts<
    ModuleIdT extends string,
    ContractNameT extends string,
    IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>
  >(
    ignitionModule: IgnitionModule<
      ModuleIdT,
      ContractNameT,
      IgnitionModuleResultsT
    >,
    result: SuccessfulDeploymentResult<ContractNameT, IgnitionModuleResultsT>
  ): Promise<
    IgnitionModuleResultsTToEthersContracts<
      ContractNameT,
      IgnitionModuleResultsT
    >
  > {
    return Object.fromEntries(
      await Promise.all(
        Object.entries(result.contracts).map(
          async ([name, deployedContract]) => [
            name,
            await this._getContract(
              ignitionModule.results[name],
              deployedContract
            ),
          ]
        )
      )
    );
  }

  private async _getContract(
    future: Future,
    deployedContract: { address: string }
  ): Promise<Contract> {
    if (!isContractFuture(future)) {
      throw new HardhatPluginError(
        "@nomicfoundation/hardhat-ignition",
        `Expected contract future but got ${future.id} with type ${future.type} instead`
      );
    }

    if ("artifact" in future) {
      return this._hre.ethers.getContractAt(
        future.artifact.abi,
        deployedContract.address
      );
    }

    return this._hre.ethers.getContractAt(
      future.contractName,
      deployedContract.address
    );
  }
}

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
