import { Contract } from "../types";

import { Binding } from "./Binding";
import { ContractOptions, ExistingContractOptions } from "./types";

export class ContractBinding extends Binding<
  ContractOptions | ExistingContractOptions,
  Contract
> {}
