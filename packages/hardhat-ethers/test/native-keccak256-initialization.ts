import assert from "node:assert/strict";
import { describe, it, before } from "node:test";

import * as ethers from "ethers";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import hardhatEthersPlugin from "../src/index.js";

const SENTINEL_DIGEST = new Uint8Array(32).fill(0xfe);

describe("native keccak256 registration from a network connection", () => {
  before(async () => {
    ethers.keccak256.register(() => SENTINEL_DIGEST);

    const hre = await createHardhatRuntimeEnvironment({
      plugins: [hardhatEthersPlugin],
    });

    await hre.network.create();
  });

  it("should have replaced ethers' implementation", () => {
    assert.notEqual(
      ethers.keccak256("0x1337"),
      ethers.hexlify(SENTINEL_DIGEST),
      "creating a connection should have registered the native keccak256 over the sentinel",
    );
  });
});
