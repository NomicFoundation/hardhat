import { ethers } from "ethers";

import { ContractOptions, Resolved } from "../bindings/types";
import { Services } from "../services/types";
import { Contract } from "../types";

import { Executor } from "./executors";

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
