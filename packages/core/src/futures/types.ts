import { ParamValue } from "../modules/types";
import { Artifact, Contract, Tx } from "../types";

import { ContractFuture } from "./ContractFuture";
import { Future } from "./Future";
import { serializeFutureOutput } from "./utils";

export type FutureOutput = string | number | Contract | Tx;

export type ModuleResult = Record<string, FutureOutput>;
export type SerializedModuleResult = Record<string, SerializedFutureResult>;
export type SerializedFutureResult = ReturnType<typeof serializeFutureOutput>;

export type SerializedDeploymentResult = Record<string, SerializedModuleResult>;

export interface ContractOptions {
  contractName: string;
  args: Array<IFuture<any>>;
  libraries?: Record<string, IFuture<any>>;
}

export interface ArtifactContractOptions {
  contractName: string;
  artifact: Artifact;
  args: Array<IFuture<any>>;
  libraries?: Record<string, IFuture<any>>;
}

export interface ExistingContractOptions {
  contractName: string;
  address: string;
  abi: any[];
}

export interface CallOptions {
  contract: ContractFuture;
  method: string;
  args: Array<IFuture<any>>;
}

export interface ParamOptions {
  paramName: string;
  defaultValue?: ParamValue;
}

export type IFuture<T extends FutureOutput> = T | Future<unknown, T>;

export type AddressLike = IFuture<string> | Future<any, Contract>;

export type Unflattened<T> = T[] | Array<Unflattened<T>>;

export type Resolved<T> = T extends Future<any, infer O>
  ? O
  : {
      [K in keyof T]: T[K] extends Future<any, infer O> ? O : Resolved<T[K]>;
    };
