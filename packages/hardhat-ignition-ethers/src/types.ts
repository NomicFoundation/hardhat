import type {
  IgnitionModuleResult,
  StrategyConfig,
  IgnitionModule,
  DeploymentParameters,
  DeployConfig,
  NamedArtifactContractDeploymentFuture,
  NamedArtifactContractAtFuture,
} from "@nomicfoundation/ignition-core";
import type { Contract } from "ethers/contract";

export interface EthersIgnitionHelper {
  type: "ethers";

  deploy<
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
    options?: {
      parameters?: DeploymentParameters | string;
      config?: Partial<DeployConfig>;
      defaultSender?: string;
      strategy?: StrategyT;
      strategyConfig?: StrategyConfig[StrategyT];
      deploymentId?: string;
      displayUi?: boolean;
    },
  ): Promise<
    IgnitionModuleResultsTToEthersContracts<
      ContractNameT,
      IgnitionModuleResultsT
    >
  >;

  getResolvedConfig(
    perDeployConfig: Partial<DeployConfig>,
  ): Partial<DeployConfig>;
}

export type IgnitionModuleResultsTToEthersContracts<
  ContractNameT extends string,
  IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>,
> = {
  [contract in keyof IgnitionModuleResultsT]: IgnitionModuleResultsT[contract] extends
    | NamedArtifactContractDeploymentFuture<ContractNameT>
    | NamedArtifactContractAtFuture<ContractNameT>
    ? TypeChainEthersContractByName<ContractNameT>
    : Contract;
};

// TODO: Make this work to have support for TypeChain
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- this is a placeholder for TypeChain support
export type TypeChainEthersContractByName<ContractNameT> = Contract;
