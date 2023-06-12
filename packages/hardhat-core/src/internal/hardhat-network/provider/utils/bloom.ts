// This code was adapted from ethereumjs and is distributed under their license: https://github.com/ethereumjs/ethereumjs-monorepo/blob/161a4029c2fc24e5d04da6ad3aab4ac3c72af0f8/packages/vm/LICENSE
// For the original context see: https://github.com/ethereumjs/ethereumjs-monorepo/blob/161a4029c2fc24e5d04da6ad3aab4ac3c72af0f8/packages/vm/src/bloom/index.ts

import { zeros } from "@nomicfoundation/ethereumjs-util";
import { keccak256 } from "ethereum-cryptography/keccak";

import { assertHardhatInvariant } from "../../../core/errors";

/* eslint-disable no-bitwise */

const BYTE_SIZE = 256;

export class Bloom {
  public bitvector: Buffer;

  /**
   * Represents a Bloom filter.
   */
  constructor(bitvector?: Buffer) {
    if (bitvector === undefined) {
      this.bitvector = zeros(BYTE_SIZE);
    } else {
      assertHardhatInvariant(
        bitvector.length === BYTE_SIZE,
        "bitvectors must be 2048 bits long"
      );
      this.bitvector = bitvector;
    }
  }

  /**
   * Adds an element to a bit vector of a 64 byte bloom filter.
   * @param e - The element to add
   */
  public add(e: Buffer) {
    e = Buffer.from(keccak256(e));
    const mask = 2047; // binary 11111111111

    for (let i = 0; i < 3; i++) {
      const first2bytes = e.readUInt16BE(i * 2);
      const loc = mask & first2bytes;
      const byteLoc = loc >> 3;
      const bitLoc = 1 << loc % 8;
      this.bitvector[BYTE_SIZE - byteLoc - 1] |= bitLoc;
    }
  }

  /**
   * Checks if an element is in the bloom.
   * @param e - The element to check
   */
  public check(e: Buffer): boolean {
    e = Buffer.from(keccak256(e));
    const mask = 2047; // binary 11111111111
    let match = true;

    for (let i = 0; i < 3 && match; i++) {
      const first2bytes = e.readUInt16BE(i * 2);
      const loc = mask & first2bytes;
      const byteLoc = loc >> 3;
      const bitLoc = 1 << loc % 8;
      match = (this.bitvector[BYTE_SIZE - byteLoc - 1] & bitLoc) !== 0;
    }

    return Boolean(match);
  }

  /**
   * Checks if multiple topics are in a bloom.
   * @returns `true` if every topic is in the bloom
   */
  public multiCheck(topics: Buffer[]): boolean {
    return topics.every((t: Buffer) => this.check(t));
  }

  /**
   * Bitwise or blooms together.
   */
  public or(bloom: Bloom) {
    for (let i = 0; i <= BYTE_SIZE; i++) {
      this.bitvector[i] = this.bitvector[i] | bloom.bitvector[i];
    }
  }

  /**
   * Checks equality with another bloom.
   */
  public equals(otherBloom: Bloom): boolean {
    return this.bitvector.equals(otherBloom.bitvector);
  }
}
