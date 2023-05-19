import type { ExternalParamValue } from "../types/dsl";
import type {
  ContractFutureOld,
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
  | ContractFutureOld
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

/**
 * A mapping of parameter labels to allowed values or futures.
 *
 * @alpha
 */
export interface ModuleParams {
  [key: string]: ExternalParamValue;
}
