import setupDebug, { IDebugger } from "debug";
import { ethers } from "ethers";

import { InternalBinding } from "./bindings/InternalBinding";
import { InternalContractBinding } from "./bindings/InternalContractBinding";
import {
  BindingOutput,
  CallOptions,
  ContractOptions,
  Resolved,
} from "./bindings/types";
import { BindingState } from "./deployment-state";
import { Services } from "./services/types";
import { Contract, Tx } from "./types";

/**
 * An instance of this class is thrown to indicate that the executor is waiting
 * for some external event to happen, like a multisig that needs extra
 * confirmations or a timelocked contract.
 */
export class Hold {
  constructor(public readonly reason: string) {}
}

export abstract class Executor<I = unknown, O extends BindingOutput = any> {
  private _dummyInput!: I;
  private _dummyOutput!: O;
  private state: "ready" | "running" | "hold" | "success" | "failure" = "ready";
  private result?: any;
  private error?: any;
  private holdReason?: string;
  private _debug: IDebugger;

  constructor(public readonly binding: InternalBinding<I, O>) {
    const moduleId = binding.moduleId;
    const bindingId = binding.id;
    this._debug = setupDebug(`ignition:executor:${moduleId}:${bindingId}`);
  }

  abstract execute(input: Resolved<I>, services: Services): Promise<O>;
  abstract validate(input: I, services: Services): Promise<string[]>;
  abstract getDescription(): string;

  public async run(
    input: Resolved<I>,
    services: Services,
    onStateChange: (newState: BindingState) => void
  ) {
    try {
      this._debug("Start running");
      this._setRunning();
      onStateChange(BindingState.running());
      const result = await this.execute(input, services);
      this._debug("Ended successfully");
      this._setSuccess(result);
      onStateChange(BindingState.success(result));
    } catch (e: any) {
      if (e instanceof Hold) {
        this._debug("Ended with hold");
        this._setHold(e.reason);
        onStateChange(BindingState.hold(e.reason));
      } else {
        this._debug("Ended with error");
        this._setFailure(e);
        onStateChange(BindingState.failure(e));
      }
    }
  }

  public isReady() {
    return this.state === "ready";
  }

  public isRunning() {
    return this.state === "running";
  }

  public isHold() {
    return this.state === "hold";
  }

  public getHoldReason(): string {
    if (this.holdReason === undefined) {
      throw new Error(
        `[executor ${this.binding.id}] assertion error: no hold reason`
      );
    }

    return this.holdReason;
  }

  public isSuccess() {
    return this.state === "success";
  }

  public getResult() {
    if (this.result === undefined) {
      throw new Error(
        `[executor ${this.binding.id}] assertion error: no result`
      );
    }

    return this.result;
  }

  public isFailure() {
    return this.state === "failure";
  }

  public getError() {
    if (this.error === undefined) {
      throw new Error("assertion error");
    }

    return this.error;
  }

  private _setRunning() {
    this.state = "running";
  }
  private _setHold(reason: string) {
    this.state = "hold";
    this.holdReason = reason;
  }
  private _setSuccess(result: any) {
    this.state = "success";
    this.result = result;
  }
  private _setFailure(err: Error) {
    this.state = "failure";
    this.error = err;
  }
}

export class ContractExecutor extends Executor<ContractOptions, Contract> {
  public async execute(
    input: Resolved<ContractOptions>,
    services: Services
  ): Promise<Contract> {
    const { contractName } = input;
    const artifact = await services.artifacts.getArtifact(contractName);

    const mapToAddress = (x: any): any => {
      if (typeof x === "string") {
        return x;
      }

      if (x === undefined || x === null) {
        return x;
      }

      if ((x as any).address) {
        return (x as any).address;
      }

      if (Array.isArray(x)) {
        return x.map(mapToAddress);
      }

      return x;
    };

    const args = input.args.map(mapToAddress);
    const txHash = await services.contracts.deploy(artifact, args);

    const receipt = await services.transactions.wait(txHash);

    return {
      name: contractName,
      abi: artifact.abi,
      address: receipt.contractAddress,
      bytecode: artifact.bytecode,
    };
  }

  public async validate(
    input: ContractOptions,
    services: Services
  ): Promise<string[]> {
    const artifactExists = await services.artifacts.hasArtifact(
      input.contractName
    );

    if (!artifactExists) {
      return [`Artifact with name '${input.contractName}' doesn't exist`];
    }

    const artifact = await services.artifacts.getArtifact(input.contractName);
    const argsLength = input.args.length;

    const iface = new ethers.utils.Interface(artifact.abi);
    const expectedArgsLength = iface.deploy.inputs.length;

    if (argsLength !== expectedArgsLength) {
      return [
        `The constructor of the contract '${input.contractName}' expects ${expectedArgsLength} arguments but ${argsLength} were given`,
      ];
    }

    return [];
  }

  public getDescription() {
    return `Deploy contract ${this.binding.input.contractName}`;
  }
}

export class CallExecutor extends Executor<CallOptions, Tx> {
  public async execute(
    input: Resolved<CallOptions>,
    services: Services
  ): Promise<Tx> {
    const { contract, method } = input;
    const mapToAddress = (x: any): any => {
      if (typeof x === "string") {
        return x;
      }

      if (x === undefined || x === null) {
        return x;
      }

      if ((x as any).address) {
        return (x as any).address;
      }

      if (Array.isArray(x)) {
        return x.map(mapToAddress);
      }

      return x;
    };

    const args = input.args.map(mapToAddress);
    const txHash = await services.contracts.call(
      contract.address,
      contract.abi,
      method,
      args
    );

    await services.transactions.wait(txHash);

    return {
      hash: txHash,
    };
  }

  public async validate(
    input: CallOptions,
    services: Services
  ): Promise<string[]> {
    const contractName = (input.contract as InternalContractBinding).input
      .contractName;
    const artifactExists = await services.artifacts.hasArtifact(contractName);

    if (!artifactExists) {
      return [`Artifact with name '${contractName}' doesn't exist`];
    }

    const artifact = await services.artifacts.getArtifact(contractName);
    const argsLength = input.args.length;

    const iface = new ethers.utils.Interface(artifact.abi);
    const functionFragments = iface.fragments.filter(
      (f) => f.name === input.method
    );

    if (functionFragments.length === 0) {
      return [
        `Contract '${contractName}' doesn't have a function ${input.method}`,
      ];
    }

    const matchingFunctionFragments = functionFragments.filter(
      (f) => f.inputs.length === argsLength
    );

    if (matchingFunctionFragments.length === 0) {
      if (functionFragments.length === 1) {
        return [
          `Function ${input.method} in contract ${contractName} expects ${functionFragments[0].inputs.length} arguments but ${argsLength} were given`,
        ];
      } else {
        return [
          `Function ${input.method} in contract ${contractName} is overloaded, but no overload expects ${argsLength} arguments`,
        ];
      }
    }

    return [];
  }

  public getDescription() {
    const contractName = (
      this.binding.input.contract as InternalContractBinding
    ).input.contractName;
    return `Call method ${this.binding.input.method} in contract ${contractName}`;
  }
}
