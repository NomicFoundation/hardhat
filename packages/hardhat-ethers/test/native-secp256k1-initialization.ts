import assert from "node:assert/strict";
import { describe, it, before } from "node:test";

import * as ethers from "ethers";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import hardhatEthersPlugin from "../src/index.js";

// Captured before the connection installs the replacement. The installation
// restores this method whenever it can't use the native derivation, so the
// method having changed is what tells a working installation from a silent
// fallback.
const jsComputePublicKey = ethers.SigningKey.computePublicKey;

describe("native secp256k1 installation from a network connection", () => {
  before(async () => {
    const hre = await createHardhatRuntimeEnvironment({
      plugins: [hardhatEthersPlugin],
    });

    await hre.network.create();
  });

  it("should have replaced ethers' implementation", () => {
    assert.notEqual(
      ethers.SigningKey.computePublicKey,
      jsComputePublicKey,
      "creating a connection should have installed the native derivation",
    );
  });
});
