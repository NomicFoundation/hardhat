import { ethers } from "ethers";

import { InternalContractBinding } from "../bindings/InternalContractBinding";
import { CallOptions, Resolved } from "../bindings/types";
import { Services } from "../services/types";
import { Tx } from "../types";

import { Executor } from "./executors";

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
