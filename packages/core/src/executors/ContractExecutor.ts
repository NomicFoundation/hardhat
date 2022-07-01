import { ethers } from "ethers";

import {
  ArtifactContractOptions,
  ContractOptions,
  Resolved,
} from "../bindings/types";
import { Services } from "../services/types";
import type { Artifact, Contract, DeployedContract } from "../types";

import { Executor } from "./Executor";
import { mapToAddress } from "./utils";

export class ContractExecutor extends Executor<ContractOptions, Contract> {
  public async execute(
    input: Resolved<ContractOptions>,
    services: Services
  ): Promise<DeployedContract> {
    const artifact = await this._resolveArtifactFromInput(input, services);

    const args = input.args.map(mapToAddress);
    const libraries = Object.fromEntries(
      Object.entries(input.libraries ?? {}).map(([k, v]) => [
        k,
        mapToAddress(v),
      ])
    );
    const txHash = await services.contracts.deploy(artifact, args, libraries);
    const receipt = await services.transactions.wait(txHash);

    return {
      name: artifact.contractName,
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      address: receipt.contractAddress,
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

  private async _resolveArtifactFromInput(
    input: Resolved<ContractOptions | ArtifactContractOptions>,
    services: Services
  ): Promise<Artifact> {
    if ("artifact" in input) {
      return input.artifact;
    }

    const { contractName } = input;

    const artifact = await services.artifacts.getArtifact(contractName);

    return artifact;
  }
}
