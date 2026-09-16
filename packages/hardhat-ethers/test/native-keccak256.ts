import assert from "node:assert/strict";
import { describe, it, before } from "node:test";

import * as ethers from "ethers";
import { keccak256 as nativeKeccak256 } from "hardhat/internal/native-crypto";

import { registerNativeKeccak256 } from "../src/internal/native-keccak256.js";

const SENTINEL_DIGEST = new Uint8Array(32).fill(0xfe);

describe("native keccak256 registration", () => {
  before(() => {
    ethers.keccak256.register(() => SENTINEL_DIGEST);

    registerNativeKeccak256();
  });

  it("should install the native implementation over the registered one", () => {
    assert.notEqual(
      ethers.keccak256("0x1337"),
      ethers.hexlify(SENTINEL_DIGEST),
      "registerNativeKeccak256 should have registered over the sentinel",
    );

    assert.equal(
      ethers.keccak256("0x1337"),
      ethers.hexlify(nativeKeccak256(ethers.getBytes("0x1337"))),
    );
  });

  it("should not register again on later calls", () => {
    const digestBefore = ethers.keccak256("0x1337");

    ethers.keccak256.register(() => SENTINEL_DIGEST);
    try {
      registerNativeKeccak256();

      assert.equal(
        ethers.keccak256("0x1337"),
        ethers.hexlify(SENTINEL_DIGEST),
        "a repeated call shouldn't overwrite an implementation registered after the first one",
      );
    } finally {
      ethers.keccak256.register(nativeKeccak256);
    }

    assert.equal(ethers.keccak256("0x1337"), digestBefore);
  });

  it("should hash pooled-Buffer views correctly through ethers", () => {
    const pool = Buffer.alloc(64);
    const pooled = pool.subarray(
      8,
      8 + pool.write("hashed as a pooled Buffer", 8),
    );
    assert.notEqual(pooled.byteOffset, 0);

    assert.equal(
      ethers.keccak256(pooled),
      ethers.hexlify(nativeKeccak256(Uint8Array.from(pooled))),
    );
  });

  it("should produce the well-known digest of an event signature", () => {
    assert.equal(
      ethers.id("Transfer(address,address,uint256)"),
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
    );
  });
});
