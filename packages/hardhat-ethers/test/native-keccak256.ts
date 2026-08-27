import type { Keccak256 } from "hardhat/internal/edr";

import assert from "node:assert/strict";
import { describe, it, before } from "node:test";

import * as ethers from "ethers";
import { getNativeKeccak256 } from "hardhat/internal/edr";

import { registerNativeKeccak256 } from "../src/internal/native-keccak256.js";

const SENTINEL_DIGEST = new Uint8Array(32).fill(0xfe);

describe("native keccak256 registration", () => {
  let nativeKeccak256: Keccak256;

  before(async () => {
    const maybeNative = await getNativeKeccak256();
    assert.ok(
      maybeNative !== undefined,
      "EDR's native keccak256 should be available on the platforms that run this suite",
    );
    nativeKeccak256 = maybeNative;

    ethers.keccak256.register(() => SENTINEL_DIGEST);

    await registerNativeKeccak256();
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

  it("should not register again on later calls", async () => {
    const digestBefore = ethers.keccak256("0x1337");

    ethers.keccak256.register(() => SENTINEL_DIGEST);
    try {
      await registerNativeKeccak256();

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
    Buffer.from("move the pool's offset");
    const pooled = Buffer.from("hashed as a pooled Buffer");
    assert.notEqual(
      pooled.byteOffset,
      0,
      "expected Buffer.from to return a pooled view with a non-zero offset",
    );

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
