import crypto from "crypto";
import util from "util";

// Produces a signature with r and s values taken from a hash of the inputs.
export function makeFakeSignature(...inputs: any[]): {
  v: number;
  r: number;
  s: number;
} {
  const hash = crypto.createHash("md5");

  for (const input of inputs) {
    hash.update(Buffer.from(`${util.inspect(input)}`));
  }

  const hashDigest = hash.digest();

  return {
    v: 1,
    r: hashDigest.readUInt32LE(),
    s: hashDigest.readUInt32LE(4),
  };
}
