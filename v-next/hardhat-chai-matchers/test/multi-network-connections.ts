import type { EthereumProvider } from "@ignored/hardhat-vnext/types/providers";
import type {
  HardhatEthers,
  HardhatEthersSigner,
} from "@ignored/hardhat-vnext-ethers/types";

import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";

import { createHardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/hre";
import hardhatEthersPlugin from "@ignored/hardhat-vnext-ethers";
import { expect } from "chai";

import hardhatChaiMatchersPlugin from "../src/index.js";

describe("handle multiple connections", () => {
  let sender: HardhatEthersSigner;
  let receiver: HardhatEthersSigner;

  let sender2: HardhatEthersSigner;
  let receiver2: HardhatEthersSigner;

  let provider: EthereumProvider;
  let ethers: HardhatEthers;

  let provider2: EthereumProvider;
  let ethers2: HardhatEthers;

  before(async () => {
    const hre = await createHardhatRuntimeEnvironment({
      plugins: [hardhatChaiMatchersPlugin, hardhatEthersPlugin],
      networks: {
        test1: {
          type: "edr",
          chainId: 1,
        },
        test2: {
          type: "edr",
          chainId: 2,
        },
      },
    });

    ({ ethers, provider } = await hre.network.connect("test1"));

    ({ ethers: ethers2, provider: provider2 } =
      await hre.network.connect("test2"));
  });

  beforeEach(async () => {
    const wallets = await ethers.getSigners();
    sender = wallets[0];
    receiver = wallets[1];

    const wallets2 = await ethers2.getSigners();
    sender2 = wallets2[0];
    receiver2 = wallets2[1];
  });

  describe("it should handle 2 separate connections", () => {
    it("should modify the balance only in the first connection, not te second one", async () => {
      // Be sure that the addresses in the 2 networks are the same
      assert.equal(sender.address, sender2.address);
      assert.equal(receiver.address, receiver2.address);

      // Send a transaction from the first connection
      let nonceSender = await sender.getNonce();
      let nonceSender2 = await sender2.getNonce();

      await expect(() =>
        sender.sendTransaction({
          to: receiver.address,
          value: 200,
        }),
      ).to.changeEtherBalance(provider, sender, "-200");

      // Only the sender nonce should be changed
      assert.equal(await sender.getNonce(), nonceSender + 1);
      assert.equal(await sender2.getNonce(), nonceSender2);

      // Send a transaction from the second connection
      nonceSender = await sender.getNonce();
      nonceSender2 = await sender2.getNonce();

      await expect(() =>
        sender2.sendTransaction({
          to: receiver2.address,
          value: 200,
        }),
      ).to.changeEtherBalance(provider2, sender2, "-200");

      // Only the sender2 nonce should be changed
      assert.equal(await sender.getNonce(), nonceSender);
      assert.equal(await sender2.getNonce(), nonceSender2 + 1);
    });
  });
});
