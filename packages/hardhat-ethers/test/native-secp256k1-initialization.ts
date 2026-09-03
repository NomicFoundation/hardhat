import assert from "node:assert/strict";
import { describe, it, before } from "node:test";

import * as ethers from "ethers";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";
import { getNativeSecp256k1PublicKeyFromSecretKey } from "hardhat/internal/edr";

import hardhatEthersPlugin from "../src/index.js";
import { getNativeSecp256k1CallCount } from "../src/internal/native-secp256k1.js";

const SECRET_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

describe("native secp256k1 installation from a network connection", () => {
  before(async () => {
    assert.ok(
      (await getNativeSecp256k1PublicKeyFromSecretKey()) !== undefined,
      "EDR's native secp256k1 derivation should be available on the platforms that run this suite",
    );

    const hre = await createHardhatRuntimeEnvironment({
      plugins: [hardhatEthersPlugin],
    });

    await hre.network.create();
  });

  it("should have replaced ethers' implementation", () => {
    const callCountBefore = getNativeSecp256k1CallCount();

    new ethers.Wallet(SECRET_KEY);

    assert.ok(
      getNativeSecp256k1CallCount() > callCountBefore,
      "creating a connection should have installed the native derivation",
    );
  });
});
