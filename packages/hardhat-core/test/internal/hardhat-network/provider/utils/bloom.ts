// This code was adapted from ethereumjs and is distributed under their license: https://github.com/ethereumjs/ethereumjs-monorepo/blob/161a4029c2fc24e5d04da6ad3aab4ac3c72af0f8/packages/vm/LICENSE
// For the original context see: https://github.com/ethereumjs/ethereumjs-monorepo/blob/161a4029c2fc24e5d04da6ad3aab4ac3c72af0f8/packages/vm/test/api/bloom.spec.ts

import { assert } from "chai";
import { Bloom } from "../../../../../src/internal/hardhat-network/provider/utils/bloom";

const byteSize = 256;

function zeros(size: number): Buffer {
  return Buffer.allocUnsafe(size).fill(0);
}

describe("bloom", () => {
  it("should initialize without params", () => {
    const b = new Bloom();
    assert.deepEqual(b.bitvector, zeros(byteSize), "should be empty");
  });

  it("shouldnt initialize with invalid bitvector", () => {
    assert.throws(
      () => new Bloom(zeros(byteSize / 2)),
      /bitvectors must be 2048 bits long/,
      "should fail for invalid length"
    );
  });

  it("should contain values of hardcoded bitvector", () => {
    const hex =
      "00000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000";
    const vector = Buffer.from(hex, "hex");

    const b = new Bloom(vector);
    assert.isTrue(
      b.check(Buffer.from("value 1", "utf8")),
      'should contain string "value 1"'
    );
    assert.isTrue(
      b.check(Buffer.from("value 2", "utf8")),
      'should contain string "value 2"'
    );
  });

  it("check shouldnt be tautology", () => {
    const b = new Bloom();
    assert.isFalse(
      b.check(Buffer.from("random value", "utf8")),
      'should not contain string "random value"'
    );
  });

  it("should correctly add value", () => {
    const b = new Bloom();
    b.add(Buffer.from("value", "utf8"));
    const found = b.check(Buffer.from("value", "utf8"));
    assert.isTrue(found, "should contain added value");
  });

  it("should check multiple values", () => {
    const b = new Bloom();
    b.add(Buffer.from("value 1", "utf8"));
    b.add(Buffer.from("value 2", "utf8"));
    const found = b.multiCheck([
      Buffer.from("value 1"),
      Buffer.from("value 2"),
    ]);
    assert.isTrue(found, "should contain both values");
  });

  it("should or two filters", () => {
    const b1 = new Bloom();
    b1.add(Buffer.from("value 1", "utf8"));
    const b2 = new Bloom();
    b2.add(Buffer.from("value 2", "utf8"));

    b1.or(b2);
    assert.isTrue(
      b1.check(Buffer.from("value 2", "utf-8")),
      'should contain "value 2" after or'
    );
  });

  it("should generate the correct bloom filter value", () => {
    const bloom = new Bloom();
    bloom.add(Buffer.from("1d7022f5b17d2f8b695918fb48fa1089c9f85401", "hex"));
    bloom.add(
      Buffer.from(
        "8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925",
        "hex"
      )
    );
    bloom.add(
      Buffer.from(
        "0000000000000000000000005409ed021d9299bf6814279a6a1411a7e866a631",
        "hex"
      )
    );
    bloom.add(
      Buffer.from(
        "0000000000000000000000001dc4c1cefef38a777b15aa20260a54e584b16c48",
        "hex"
      )
    );
    assert.equal(
      bloom.bitvector.toString("hex"),
      "00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000081100200000000000000000000000000000000000000000000000000000000008000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000002000000000000000004000000000000000000000"
    );
  });
});
