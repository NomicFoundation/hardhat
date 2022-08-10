import { Executor } from "../executors/Executor";
import { CallFuture } from "../futures/CallFuture";
import { ContractFuture } from "../futures/ContractFuture";
import type { IFuture } from "../futures/types";
import { Artifact } from "../types";

import { UserModule } from "./UserModule";

export interface UserContractOptions {
  id?: string;
  args?: Array<IFuture<any>>;
  libraries?: Record<string, ContractFuture>;
}

export interface UserCallOptions {
  id?: string;
  args?: Array<IFuture<any>>;
}

export interface ModuleBuilder {
  chainId: number;

  getModuleId: () => string;
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

  useModule: <T>(userModule: UserModule<T>) => T;
}

export type ModuleDefinition<T> = (m: ModuleBuilder) => T;
