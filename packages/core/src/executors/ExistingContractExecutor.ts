import { isAddress } from "@ethersproject/address";

import { ExistingContractOptions } from "../futures/types";
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
        `The existing contract ${this.future.input.contractName} is an invalid address ${input.address}`,
      ];
    }

    return [];
  }

  public getDescription() {
    return `Using existing contract ${this.future.input.contractName} (${this.future.input.address})`;
  }
}
