import { Keccak } from "keccak";

export function keccak256(data: Uint8Array): Uint8Array {
  const hash = new Keccak(256, 0, null, 256, {});
  hash.update(Buffer.from(data));
  return hash.digest();
}
