import { Contract } from "../types";

import { InternalFuture } from "./InternalFuture";
import type { ExistingContractOptions } from "./types";

export class ExistingContractFuture extends InternalFuture<
  ExistingContractOptions,
  Contract
> {
  public getDependencies(): InternalFuture[] {
    return [];
  }
}
