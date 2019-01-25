import { Linker, TruffleContract } from "./types";

export class LazyTruffleContractProvisioner {
  constructor(private readonly web3: any) {}

  public provision(Contract: TruffleContract, linker: Linker) {
    Contract.setProvider(this.web3.currentProvider);

    const originalLink = Contract.link;
    Contract.link = (...args: any[]) => {
      // This is a simple way to detect if it is being called with a contract as first argument.
      if (Array.isArray(args[0].abi)) {
        return linker.link(Contract, args[0]);
      }

      // TODO: This may break if called manually with (name, address), as solc changed
      // the format of its symbols.

      originalLink.apply(Contract, args);
    };

    this.hookCloneCalls(Contract, linker);

    return Contract;
  }

  private hookCloneCalls(Contract: TruffleContract, linker: Linker) {
    const originalClone = Contract.clone;

    Contract.clone = (...args: any[]) => {
      const cloned = originalClone.apply(Contract, args);

      return this.provision(cloned, linker);
    };
  }
}
