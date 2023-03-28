import type { ExternalParamValue } from "../types/dsl";
import type {
  ContractFuture,
  LibraryFuture,
  ProxyFuture,
  Virtual,
} from "./future";

import { IDeploymentBuilder } from "./dsl";

/**
 * The potential return results of deploying a module.
 *
 * @alpha
 */
export type ModuleReturnValue =
  | ContractFuture
  | LibraryFuture
  | Virtual
  | ProxyFuture;

/**
 * The results of deploying a module.
 *
 * @alpha
 */
export interface ModuleDict {
  [key: string]: ModuleReturnValue;
}

/**
 * An Ignition module that can be deployed.
 *
 * @alpha
 */
export interface Module<T extends ModuleDict> {
  name: string;
  action: (builder: IDeploymentBuilder) => T;
}

export interface ModuleData {
  result: Virtual & ModuleDict;
  optionsHash: string;
}

export interface ModuleCache {
  [label: string]: ModuleData;
}

/**
 * A mapping of parameter labels to allowed values or futures.
 *
 * @internal
 */
export interface ModuleParams {
  [key: string]: ExternalParamValue;
}
