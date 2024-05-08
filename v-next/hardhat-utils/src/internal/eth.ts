import { keccak256 } from "../crypto.js";

class RandomBytesGenerator {
  private constructor(private _nextValue: Uint8Array) {}

  public static async create(seed: string): Promise<RandomBytesGenerator> {
    const nextValue = await keccak256(Buffer.from(seed));

    return new RandomBytesGenerator(nextValue);
  }

  public async next(): Promise<Uint8Array> {
    const valueToReturn = this._nextValue;

    this._nextValue = await keccak256(this._nextValue);

    return valueToReturn;
  }
}

let hashGenerator: RandomBytesGenerator | null = null;
let addressGenerator: RandomBytesGenerator | null = null;

export async function getHashGenerator() {
  if (hashGenerator === null) {
    hashGenerator = await RandomBytesGenerator.create("hashSeed");
  }
  return hashGenerator;
}

export async function getAddressGenerator() {
  if (addressGenerator === null) {
    addressGenerator = await RandomBytesGenerator.create("addressSeed");
  }
  return addressGenerator;
}
