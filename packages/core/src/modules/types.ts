import { CallBinding } from "../bindings/CallBinding";
import { ContractBinding } from "../bindings/ContractBinding";
import { Bindable } from "../bindings/types";
import { Executor } from "../executors/executors";

import { UserModule } from "./UserModule";

export interface UserContractOptions {
  id?: string;
  args?: Array<Bindable<any>>;
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

  call: (
    contract: ContractBinding,
    method: string,
    options?: UserCallOptions
  ) => CallBinding;

  useModule: <T>(userModule: UserModule<T>) => T;
}

export type ModuleDefinition<T> = (m: ModuleBuilder) => T;
