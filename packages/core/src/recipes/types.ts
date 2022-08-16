import { Executor } from "../executors/Executor";
import { CallFuture } from "../futures/CallFuture";
import { ContractFuture } from "../futures/ContractFuture";
import { ParamFuture } from "../futures/ParamFuture";
import type { IFuture } from "../futures/types";
import { Artifact } from "../types";

import { UserRecipe } from "./UserRecipe";

export interface UserContractOptions {
  id?: string;
  args?: Array<IFuture<any>>;
  libraries?: Record<string, ContractFuture>;
}

export interface UserCallOptions {
  id?: string;
  args?: Array<IFuture<any>>;
}

export type ParamValue = string | number;

export interface RecipeBuilder {
  chainId: number;

  getRecipeId: () => string;
  addExecutor: (executor: Executor) => void;

  contract: (
    contractName: string,
    artifactOrOptions?: Artifact | UserContractOptions,
    options?: UserContractOptions
  ) => ContractFuture;

  contractAt: (
    contractName: string,
    address: string,
    abi: any[]
  ) => ContractFuture;

  call: (
    contract: ContractFuture,
    method: string,
    options?: UserCallOptions
  ) => CallFuture;

  useRecipe: <T>(userRecipe: UserRecipe<T>) => T;

  getParam: (paramName: string) => ParamFuture;

  getOptionalParam: (
    paramName: string,
    defaultValue: ParamValue
  ) => ParamFuture;
}

export type RecipeDefinition<T> = (m: RecipeBuilder) => T;
