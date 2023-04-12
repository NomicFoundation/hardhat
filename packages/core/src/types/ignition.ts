import { BigNumber } from "ethers";

import { Module, ModuleDict } from "./module";
import { IgnitionPlan } from "./plan";

/**
 * The type of the CommandJournal that Ignition uses.
 *
 * @alpha
 */
export type ICommandJournalT = unknown;

/**
 * The type of a callback to update the UI.
 *
 * @alpha
 */
export type UpdateUiActionT = unknown;

/**
 * The configuration options that control how on-chain execution will happen
 * during the deploy.
 *
 * @alpha
 */
export interface IgnitionDeployOptions {
  txPollingInterval: number;
  networkName: string;
  maxRetries: number;
  gasPriceIncrementPerRetry: BigNumber | null;
  pollingInterval: number;
  eventDuration: number;
  force: boolean;
}

/**
 * The result of a deployment operation.
 *
 * @alpha
 */
export type DeploymentResultT<ModuleT extends ModuleDict = ModuleDict> = // eslint-disable-line @typescript-eslint/no-unused-vars
  unknown;

/**
 * Ignition's main interface.
 *
 * @alpha
 */
export interface Ignition {
  /**
   * Run a deployment based on a given Ignition module on-chain,
   * leveraging any configured journal to record.
   *
   * @param ignitionModule - An Ignition module
   * @param options - Configuration options
   * @returns A struct indicating whether the deployment was
   * a success, failure or hold. A successful result will
   * include the addresses of the deployed contracts.
   *
   * @alpha
   */
  deploy<T extends ModuleDict>(
    ignitionModule: Module<T>,
    options: IgnitionDeployOptions
  ): Promise<DeploymentResultT<T>>;

  /**
   * Construct a plan (or dry run) describing how a deployment will be executed
   * for the given module.
   *
   * @param deploymentModule - The Ignition module to be deployed
   * @returns The deployment details as a plan
   *
   * @alpha
   */
  plan<T extends ModuleDict>(
    deploymentModule: Module<T>
  ): Promise<IgnitionPlan>;
}
