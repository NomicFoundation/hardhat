import { CallBinding } from "../bindings/CallBinding";
import { ContractBinding } from "../bindings/ContractBinding";
import type { Bindable } from "../bindings/types";
import { Executor } from "../executors/Executor";

import { UserModule } from "./UserModule";

export interface UserContractOptions {
  id?: string;
  args?: Array<Bindable<any>>;
  libraries?: Record<string, ContractBinding>;
}

export interface UserCallOptions {
  id?: string;
  args?: Array<Bindable<any>>;
}

export interface ModuleBuilder {
  getModuleId: () => string;
  addExecutor: (executor: Executor) => void;

  contract: (
    contractName: string,
    options?: UserContractOptions
  ) => ContractBinding;

  contractAt: (
    contractName: string,
    address: string,
    abi: any[]
  ) => ContractBinding;

  call: (
    contract: ContractBinding,
    method: string,
    options?: UserCallOptions
  ) => CallBinding;

  useModule: <T>(userModule: UserModule<T>) => T;
}

export type ModuleDefinition<T> = (m: ModuleBuilder) => T;
