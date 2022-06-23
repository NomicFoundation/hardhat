import { Bindable, CallBinding, ContractBinding } from "../bindings/types";
import { Executor } from "../executors/executors";

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

export class UserModule<T> {
  public readonly version = 1;

  constructor(
    public readonly id: string,
    public readonly definition: ModuleDefinition<T>
  ) {}
}
