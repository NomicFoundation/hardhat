import { BigNumber } from "ethers";

import {
  AddressResolvable,
  ArtifactContract,
  ArtifactLibrary,
  ContractCall,
  DeployedContract,
  DeploymentGraphFuture,
  EventFuture,
  EventParamFuture,
  HardhatContract,
  HardhatLibrary,
  OptionalParameter,
  ParameterFuture,
  ParameterValue,
  RequiredParameter,
  SendFuture,
  StaticContractCall,
  Virtual,
} from "./future";
import { ArtifactOld } from "./hardhat";
import { Module, ModuleDict } from "./module";

/**
 * A builder object for specifying the different parts and
 * dependencies of your deployment.
 *
 * @alpha
 */

export interface IDeploymentBuilder {
  /**
   * The `chainId` of the network being deployed to.
   */
  chainId: number;

  /**
   * The Hardhat accounts as defined in the `Hardhat.config.{js,ts}` file,
   * deployment actions can leverage these accounts to specify which
   * account the on-chain transaction that underlies the action will
   * execute under.
   */
  accounts: string[];

  /**
   * Call a contract method.
   *
   * @param contractFuture - A contract future
   * @param functionName - the name of the method to be invoked
   * @param options - The options to control the method invocation.
   *
   * @alpha
   */
  call(
    contractFuture: DeploymentGraphFuture,
    functionName: string,
    options: CallOptionsOld
  ): ContractCall;

  /**
   * Statically call a contract method.
   *
   * @param contractFuture - A contract future
   * @param functionName - the name of the read-only method to be called
   * @param options - The options to control the method invocation.
   *
   * @alpha
   */
  staticCall(
    contractFuture: DeploymentGraphFuture,
    functionName: string,
    options: StaticCallOptionsOld
  ): StaticContractCall;

  /**
   * Deploy a named contract from Hardhat's contracts folder.
   *
   * @param contractName - The name of the contract to deploy
   * @param options - The options for controlling the deployment of the contract
   *
   * @alpha
   */
  contract(contractName: string, options?: ContractOptionsOld): HardhatContract;

  /**
   * Deploy a contract based on an artifact.
   *
   * @param contractName - The label to use for the given contract in logs,
   * errors and UI
   * @param artifact - The artifact containing the contract data (i.e. bytecode,
   *  abi etc)
   * @param options - The options for controlling the deployment of the contract
   *
   * @alpha
   */
  contract(
    contractName: string,
    artifact: ArtifactOld,
    options?: ContractOptionsOld
  ): ArtifactContract;

  /**
   * Refer to an existing deployed smart contract, the reference can be passed
   * to subsequent actions.
   *
   * @param contractName - The label to use for the given contract in logs,
   * errors and UI
   * @param address - the Ethereum address of the contract
   * @param abi - The contract's Application Binary Interface (ABI)
   * @param options - The options for controlling the use of the deployed
   *  contract
   *
   * @alpha
   */
  contractAt(
    contractName: string,
    address: string | EventParamFuture,
    abi: any[],
    options?: { after?: DeploymentGraphFuture[] }
  ): DeployedContract;

  /**
   * Wait for a contract to emit an event, then continue with the deployment
   * passing any returned arguments onto subsequent actions.
   *
   * @param contractFuture - The contract future where the event will originate
   * @param eventName - The name of the event to wait on
   * @param options - The options to control the wait for the event
   *
   * @alpha
   */
  event(
    contractFuture: DeploymentGraphFuture,
    eventName: string,
    options: AwaitOptions
  ): EventFuture;

  /**
   * Retreive an artifact for the named contract or library within Hardhat's
   * contracts folder.
   *
   * @param contractName - The name of the contract or library to retrieve
   * the artifact for
   * @returns The artifact for the contract or library
   */
  getArtifact(contractName: string): ArtifactOld;

  /**
   * Get the value of a named parameter that _can_ be passed into the currently
   * scoped Module. If the Module does not receive the parameter then the
   * default value will be used instead.
   *
   * @param paramName - The parameter name
   * @param defaultValue - The default value to use if no parameter with the
   * given name is provided to the module currently in scops.
   *
   * @alpha
   */
  getOptionalParam(
    paramName: string,
    defaultValue: ParameterValue
  ): OptionalParameter;

  /**
   * Get the value of a named parameter that _must_ be passed into the currently
   * scoped Module.
   *
   * @param paramName - The parameter name
   *
   * @alpha
   */
  getParam(paramName: string): RequiredParameter;

  /**
   * Deploy a named library from Hardhat's contracts folder.
   *
   * @param libraryName - The name of the library to deploy
   * @param options - The options to control the deployment of the library
   *
   * @alpha
   */
  library(libraryName: string, options?: ContractOptionsOld): HardhatLibrary;
  /**
   * Deploy a library based on an artifact.
   *
   * @param libraryName - The label to use for the given library in logs,
   * errors and UI
   * @param artifact - The artifact containing the library;s data (i.e.
   * bytecode, abi etc)
   * @param options - The options to control the deployment of the library
   */
  library(
    libraryName: string,
    artifact: ArtifactOld,
    options?: ContractOptionsOld
  ): ArtifactLibrary;

  /**
   * Transfer ETH to an externally owned account or contract based on address.
   *
   * @param sendTo - The Ethereum address to send the ETH to
   * @param options - The options to control the send
   *
   * @alpha
   */
  sendETH(sendTo: AddressResolvable, options: SendOptions): SendFuture;

  /**
   * Deploy a module from within the current module.
   *
   * @param module - The Ignition module to be deployed
   * @param options - The options that control the running of the submodule
   * @returns A results object that is both a future that can be depended on,
   * representing the completion of everything within the submodule,
   * and contains the contract futures of any contracts or libraries deployed.
   *
   * @alpha
   */
  useModule<T extends ModuleDict>(
    module: Module<T>,
    options?: UseModuleOptions
  ): Virtual & T;
}

/**
 * The options for an await action.
 *
 * @alpha
 */
export interface AwaitOptions {
  args: InternalParamValue[];
  after?: DeploymentGraphFuture[];
}

/**
 * The options for a smart contract method call.
 *
 * @alpha
 */
export interface CallOptionsOld {
  args: InternalParamValue[];
  after?: DeploymentGraphFuture[];
  value?: BigNumber | ParameterFuture;
  from?: string;
}

/**
 * The options for a smart contract stati call.
 *
 * @alpha
 */
export interface StaticCallOptionsOld {
  args: InternalParamValue[];
  after?: DeploymentGraphFuture[];
  from?: string;
}

/**
 * The options for a Contract deploy.
 *
 * @alpha
 */
export interface ContractOptionsOld {
  args?: InternalParamValue[];
  libraries?: {
    [key: string]: DeploymentGraphFuture;
  };
  after?: DeploymentGraphFuture[];
  value?: BigNumber | ParameterFuture;
  from?: string;
}

/**
 * The options for sending ETH to an address/contract.
 *
 * @alpha
 */
export interface SendOptions {
  value: BigNumber | ParameterFuture;
  after?: DeploymentGraphFuture[];
  from?: string;
}

/**
 * The options when using a module within another module.
 *
 * @alpha
 */
export interface UseModuleOptions {
  parameters?: { [key: string]: number | string | DeploymentGraphFuture };
  after?: DeploymentGraphFuture[];
}

/**
 * Paramater value types
 *
 * @alpha
 */
export type BaseArgumentTypeOld = number | BigNumber | string | boolean;

/**
 * Allowed parameters that can be passed into a module.
 *
 * @alpha
 */
export type ExternalParamValue =
  | BaseArgumentTypeOld
  | ExternalParamValue[]
  | { [field: string]: ExternalParamValue };

/**
 * Allowed parameters across internal `useModule` boundaries.
 *
 * @alpha
 */
export type InternalParamValue = ExternalParamValue | DeploymentGraphFuture;
