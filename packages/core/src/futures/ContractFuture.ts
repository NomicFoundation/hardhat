import { Contract } from "../types";

import { Future } from "./Future";
import { ContractOptions, ExistingContractOptions } from "./types";

export class ContractFuture extends Future<
  ContractOptions | ExistingContractOptions,
  Contract
> {}
