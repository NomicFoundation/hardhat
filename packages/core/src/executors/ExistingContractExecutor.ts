import { isAddress } from "@ethersproject/address";

import { ExistingContractOptions } from "../bindings/types";
import { Services } from "../services/types";
import { Contract } from "../types";

import { Executor } from "./Executor";

export class ExistingContractExecutor extends Executor<
  ExistingContractOptions,
  Contract
> {
  public async execute(
    {
      contractName: name,
      address,
      abi,
    }: {
      contractName: string;
      address: string;
      abi: any[];
    },
    _services: Services
  ): Promise<Contract> {
    return {
      name,
      abi,
      address,
    };
  }

  public async validate(
    input: ExistingContractOptions,
    _services: Services
  ): Promise<string[]> {
    if (!isAddress(input.address)) {
      return [
        `The existing contract ${this.binding.input.contractName} is an invalid address ${input.address}`,
      ];
    }

    return [];
  }

  public getDescription() {
    return `Using existing contract ${this.binding.input.contractName} (${this.binding.input.address})`;
  }
}
