import crypto from "crypto";
import util from "util";

import {
  AccessListEIP2930Transaction,
  FeeMarketEIP1559Transaction,
  TxData,
} from "@nomicfoundation/ethereumjs-tx";
import { Address } from "@nomicfoundation/ethereumjs-util";

// Produces a signature with r and s values taken from a hash of the inputs.
export function makeFakeSignature(
  tx: TxData | AccessListEIP2930Transaction | FeeMarketEIP1559Transaction,
  sender: Address
): {
  v: number;
  r: number;
  s: number;
} {
  const hash = crypto.createHash("md5");

  hash.update(Buffer.from(`${util.inspect(sender)}${util.inspect(tx)}`));

  const hashDigest = hash.digest();

  return {
    v: 1,
    r: hashDigest.readUInt32LE(),
    s: hashDigest.readUInt32LE(4),
  };
}
