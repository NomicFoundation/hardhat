import { Contract, Tx } from "../types";

import { Binding } from "./Binding";
import { ContractBinding } from "./ContractBinding";
import { serializeBindingOutput } from "./utils";

export type BindingOutput = string | number | Contract | Tx;

export type ModuleResult = Record<string, BindingOutput>;
export type SerializedModuleResult = Record<string, SerializedBindingResult>;
export type SerializedBindingResult = ReturnType<typeof serializeBindingOutput>;

export type SerializedDeploymentResult = Record<string, SerializedModuleResult>;

export interface ContractOptions {
  contractName: string;
  args: Array<Bindable<any>>;
  libraries?: Record<string, Bindable<any>>;
}

export interface ExistingContractOptions {
  contractName: string;
  address: string;
  abi: any[];
}

export interface CallOptions {
  contract: ContractBinding;
  method: string;
  args: Array<Bindable<any>>;
}

export type Bindable<T extends BindingOutput> = T | Binding<unknown, T>;

export type AddressLike = Bindable<string> | Binding<any, Contract>;

export type Unflattened<T> = T[] | Array<Unflattened<T>>;

export type Resolved<T> = T extends Binding<any, infer O>
  ? O
  : {
      [K in keyof T]: T[K] extends Binding<any, infer O> ? O : Resolved<T[K]>;
    };
