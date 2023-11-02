import { Address } from "@nomicfoundation/ethereumjs-util";

import { createNonCryptographicHashBasedIdentifier } from "../../../util/hash";

// Must match the EDR implementation to make sure that transaction hashes and by
// extension block hashes match for identical input.
//
// Produces a signature with r and s values taken from a hash of the inputs.
// The only requirements on a fake signature are that when it is encoded as part
// of a transaction, it produces the same hash for the same transaction from a
// sender, and it produces different hashes for different senders. We achieve
// this by setting the `r` and `s` values to the sender's address. This is the
// simplest implementation and it helps us recognize fake signatures in debug
// logs.
export function makeFakeSignature(sender: Address): {
  r: Buffer;
  s: Buffer;
} {
  return {
    r: sender.toBuffer(),
    s: sender.toBuffer(),
  };
}
