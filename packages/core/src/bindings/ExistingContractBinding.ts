import { Contract } from "../types";

import { InternalBinding } from "./InternalBinding";
import type { ExistingContractOptions } from "./types";

export class ExistingContractBinding extends InternalBinding<
  ExistingContractOptions,
  Contract
> {
  public getDependencies(): InternalBinding[] {
    return [];
  }
}
