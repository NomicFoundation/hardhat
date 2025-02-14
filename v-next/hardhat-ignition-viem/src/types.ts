import type {
  IgnitionModuleResult,
  StrategyConfig,
  IgnitionModule,
  DeploymentParameters,
  DeployConfig,
  ContractAtFuture,
  ContractDeploymentFuture,
  ContractFuture,
} from "@ignored/hardhat-vnext-ignition-core";
import type {
  ContractAbis,
  GetContractReturnType,
} from "@ignored/hardhat-vnext-viem/types";

export type IgnitionModuleResultsToViemContracts<
  ContractNameT extends string,
  IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>,
> = {
  [resultKey in keyof IgnitionModuleResultsT]: ToContractType<
    IgnitionModuleResultsT,
    resultKey
  >;
};

export interface ViemIgnitionHelper {
  type: "viem";

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
    IgnitionModuleResultsToViemContracts<ContractNameT, IgnitionModuleResultsT>
  >;
}

type ToContractType<
  IgnitionModuleResultsT extends IgnitionModuleResult<string>,
  ResultKey extends keyof IgnitionModuleResultsT,
> = IgnitionModuleResultsT[ResultKey] extends
  | ContractDeploymentFuture
  | ContractAtFuture
  ? GetContractReturnType<AbiOf<IgnitionModuleResultsT[ResultKey]>>
  : LookupContractName<
        IgnitionModuleResultsT,
        ResultKey
      > extends keyof ContractAbis
    ? LookupContractReturnTypeForContractName<
        LookupContractName<IgnitionModuleResultsT, ResultKey>
      >
    : never;

type LookupContractReturnTypeForContractName<
  ContractName extends keyof ContractAbis,
> = GetContractReturnType<ContractAbis[ContractName]>;

type LookupContractName<
  IgnitionModuleResultsT extends IgnitionModuleResult<string>,
  ResultsContractKey extends keyof IgnitionModuleResultsT,
> = ContractNameOfContractFuture<IgnitionModuleResultsT[ResultsContractKey]>;

type ContractNameOfContractFuture<ContractFutureT> =
  ContractFutureT extends ContractFuture<infer ContractName>
    ? ContractName
    : never;

export type AbiOf<ContractDeploymentFutureT> =
  ContractDeploymentFutureT extends ContractDeploymentFuture<
    infer ContractDeploymentAbi
  >
    ? ContractDeploymentAbi
    : ContractDeploymentFutureT extends ContractAtFuture<infer ContractAbiT>
      ? ContractAbiT
      : never;
