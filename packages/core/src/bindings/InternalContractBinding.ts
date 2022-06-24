import { Contract } from "../types";

import { InternalBinding } from "./InternalBinding";
import { ContractOptions, Unflattened } from "./types";
import { deepFlatten } from "./utils";

export class InternalContractBinding extends InternalBinding<
  ContractOptions,
  Contract
> {
  public getDependencies(): InternalBinding[] {
    const mapToBindings = (x: unknown): Unflattened<InternalBinding> => {
      if (Array.isArray(x)) {
        return x.map(mapToBindings);
      }

      if (InternalBinding.isBinding(x)) {
        return [x];
      }

      if (typeof x === "object" && x !== null) {
        return Object.values(x).map(mapToBindings);
      }

      return [];
    };

    const dependencies = deepFlatten(mapToBindings(this.input.args));

    return dependencies;
  }
}
