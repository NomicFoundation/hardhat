import { utf8StringToBytes } from "../bytes.js";
import { keccak256 } from "../crypto.js";
import { bytesToHexString, getUnprefixedHexString } from "../hex.js";

class RandomBytesGenerator {
  #nextValue: Uint8Array;

  private constructor(nextValue: Uint8Array) {
    this.#nextValue = nextValue;
  }

  public static async create(seed: string): Promise<RandomBytesGenerator> {
    const nextValue = await keccak256(Buffer.from(seed));

    return new RandomBytesGenerator(nextValue);
  }

  public async next(): Promise<Uint8Array> {
    const valueToReturn = this.#nextValue;

    this.#nextValue = await keccak256(this.#nextValue);

    return valueToReturn;
  }
}

let hashGenerator: RandomBytesGenerator | null = null;
let addressGenerator: RandomBytesGenerator | null = null;

export async function getHashGenerator(): Promise<RandomBytesGenerator> {
  if (hashGenerator === null) {
    hashGenerator = await RandomBytesGenerator.create("hashSeed");
  }
  return hashGenerator;
}

export async function getAddressGenerator(): Promise<RandomBytesGenerator> {
  if (addressGenerator === null) {
    addressGenerator = await RandomBytesGenerator.create("addressSeed");
  }
  return addressGenerator;
}

/**
 * Checks if a value is an Ethereum address and if the checksum is valid.
 * This method is an adaptation of the ethereumjs methods at this link:
 * https://github.com/ethereumjs/ethereumjs-monorepo/blob/47f388bfeec553519d11259fee7e7161a77b29b2/packages/util/src/account.ts#L440-L478
 * The main differences are:
 * - the two methods have been merged into one
 * - tha `eip1191ChainId` parameter has been removed.
 * - the code has been modified to use the `hardhat-utils` methods
 *
 */
export async function isValidChecksum(hexAddress: string): Promise<boolean> {
  const address = getUnprefixedHexString(hexAddress).toLowerCase();

  const bytes = utf8StringToBytes(address);

  const hash = bytesToHexString(await keccak256(bytes)).slice(2);

  let ret = "";
  for (let i = 0; i < address.length; i++) {
    if (parseInt(hash[i], 16) >= 8) {
      ret += address[i].toUpperCase();
    } else {
      ret += address[i];
    }
  }

  return `0x${ret}` === hexAddress;
}
