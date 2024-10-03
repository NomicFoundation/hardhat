import type { TransactionRequest, ethers, TransactionLike } from "ethers";

import { assertArgument, resolveAddress } from "ethers";

import {
  copyRequest,
  resolveProperties,
} from "../ethers-utils/ethers-utils.js";

export async function populate(
  signer: ethers.Signer,
  tx: TransactionRequest,
): Promise<TransactionLike<string>> {
  const pop: any = copyRequest(tx);

  if (pop.to !== null && pop.to !== undefined) {
    pop.to = resolveAddress(pop.to, signer);
  }

  if (pop.from !== null && pop.from !== undefined) {
    const from = pop.from;
    pop.from = Promise.all([
      signer.getAddress(),
      resolveAddress(from, signer),
    ]).then(([address, resolvedFrom]) => {
      assertArgument(
        address.toLowerCase() === resolvedFrom.toLowerCase(),
        "transaction from mismatch",
        "tx.from",
        resolvedFrom,
      );
      return address;
    });
  } else {
    pop.from = signer.getAddress();
  }

  return resolveProperties(pop);
}
