import { GetContractReturnType } from "@nomicfoundation/hardhat-viem/types";
import {
  ContractAtFuture,
  ContractDeploymentFuture,
  ContractFuture,
  IgnitionModuleResult,
} from "@ignored/hardhat-vnext-ignition-core";
import { ArtifactsMap } from "hardhat/types";

export type IgnitionModuleResultsToViemContracts<
  ContractNameT extends string,
  IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>
> = {
  [resultKey in keyof IgnitionModuleResultsT]: ToContractType<
    IgnitionModuleResultsT,
    resultKey
  >;
};

type ToContractType<
  IgnitionModuleResultsT extends IgnitionModuleResult<string>,
  ResultKey extends keyof IgnitionModuleResultsT
> = IgnitionModuleResultsT[ResultKey] extends
  | ContractDeploymentFuture
  | ContractAtFuture
  ? GetContractReturnType<AbiOf<IgnitionModuleResultsT[ResultKey]>>
  : LookupContractName<
      IgnitionModuleResultsT,
      ResultKey
    > extends keyof ArtifactsMap
  ? LookupContractReturnTypeForContractName<
      LookupContractName<IgnitionModuleResultsT, ResultKey>
    >
  : never;

type LookupContractReturnTypeForContractName<
  ContractName extends keyof ArtifactsMap
> = GetContractReturnType<ArtifactsMap[ContractName]["abi"]>;

type LookupContractName<
  IgnitionModuleResultsT extends IgnitionModuleResult<string>,
  ResultsContractKey extends keyof IgnitionModuleResultsT
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
