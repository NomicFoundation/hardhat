import createKeccakHash from "keccak";

export function keccak256(data: Buffer): Buffer {
  return createKeccakHash("keccak256").update(data).digest();
}
