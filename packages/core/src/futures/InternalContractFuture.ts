import { Contract } from "../types";

import { InternalFuture } from "./InternalFuture";
import { ContractOptions } from "./types";
import { combineArgsAndLibrariesAsDeps } from "./utils";

export class InternalContractFuture extends InternalFuture<
  ContractOptions,
  Contract
> {
  public getDependencies(): InternalFuture[] {
    return combineArgsAndLibrariesAsDeps(
      this.input.args,
      this.input.libraries ?? {}
    );
  }
}
