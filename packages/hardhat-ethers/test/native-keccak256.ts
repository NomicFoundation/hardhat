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

  it("should produce the well-known EIP-55 checksums", () => {
    // These addresses come from the EIP-55 spec. Their checksum is derived
    // from the keccak256 of the lowercase address.
    for (const address of [
      "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed",
      "0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359",
      "0xdbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB",
      "0xD1220A0cf47c7B9Be7A2E6BA89F429762e7b9aDb",
    ]) {
      assert.equal(ethers.getAddress(address.toLowerCase()), address);

      assert.ok(
        ethers.isAddress(address),
        `${address} should be a valid checksummed address`,
      );

      assert.ok(
        !ethers.isAddress(address.replace("b", "B")),
        `${address} with a flipped case should fail its checksum`,
      );
    }
  });

  it("should produce the well-known hash of an EIP-712 typed-data payload", () => {
    // The example payload from the EIP-712 spec.
    const domain = {
      name: "Ether Mail",
      version: "1",
      chainId: 1,
      verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
    };

    const types = {
      Person: [
        { name: "name", type: "string" },
        { name: "wallet", type: "address" },
      ],
      Mail: [
        { name: "from", type: "Person" },
        { name: "to", type: "Person" },
        { name: "contents", type: "string" },
      ],
    };

    const value = {
      from: {
        name: "Cow",
        wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
      },
      to: {
        name: "Bob",
        wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
      },
      contents: "Hello, Bob!",
    };

    assert.equal(
      ethers.TypedDataEncoder.hash(domain, types, value),
      "0xbe609aee343fb3c4b28e1df9e632fca64fcfaede20f02e86244efddf30957bd2",
    );
  });
});
