import { assert } from "chai";
import { describe, it } from "node:test";

import { checkAutominedNetwork } from "../../src/internal/utils/check-automined-network.js";
import type { EIP1193Provider } from "../../src/types/provider.js";

describe("check-automin-network", () => {
  it("should confirm a Hardhat network that has automining enabled", async () =>
    assert.equal(
      await checkAutominedNetwork(setupMockProvider("hardhat", true)),
      true,
      "Hardhat network should have automining enabled",
    ));

  it("should indicate a Hardhat network that has automining disabled", async () =>
    assert.equal(
      await checkAutominedNetwork(setupMockProvider("hardhat", false)),
      false,
      "Hardhat network should _not_ have automining enabled",
    ));

  it("should confirm a ganache network", async () =>
    assert.equal(
      await checkAutominedNetwork(setupMockProvider("ganache")),
      true,
      "Ganache networks should have automining enabled",
    ));

  it("should indicate not an automining network for other networks", async () =>
    assert.equal(
      await checkAutominedNetwork(setupMockProvider("other")),
      false,
      "Other network should _not_ have automining enabled",
    ));
});

function setupMockProvider(
  network: "hardhat" | "ganache" | "other",
  autominingEnabled = true,
): EIP1193Provider {
  return {
    request: async ({
      method,
    }: {
      method: "hardhat_getAutomine" | "web3_clientVersion";
    }) => {
      if (method === "hardhat_getAutomine") {
        if (network === "hardhat") {
          return autominingEnabled as boolean;
        }

        throw new Error("RPC Method hardhat_getAutomine not supported - TEST");
      }

      if (method === "web3_clientVersion") {
        if (network === "ganache") {
          return "ganache network";
        }

        if (network === "hardhat") {
          return "hardhat network";
        }

        throw new Error("RPC Method web3_clientVersion not supported - TEST");
      }

      throw new Error(`RPC Method ${method as string} not supported - TEST`);
    },
  } as any;
}
