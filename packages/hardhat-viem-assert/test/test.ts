import { expect } from "../src/index.js";
import { useEnvironment } from "./helpers.js";

import { describe, it } from "node:test";

describe("hardhat-toolbox-viem", function () {
  describe("only-toolbox", function () {
    const getHre = useEnvironment("hardhat-project");

    it("has all the expected things in the HRE", async function () {
      const [bobWalletClient, aliceWalletClient] =
        await getHre().viem.getWalletClients();

      const publicClient = await getHre().viem.getPublicClient();

      await expect(async () => {
        console.log("run f");

        const hash = await bobWalletClient.sendTransaction({
          to: aliceWalletClient.account.address,
          value: 1000000000000000000000n,
        });

        await publicClient.waitForTransactionReceipt({ hash });
      }).to.changeEtherBalance(
        bobWalletClient.account.address,
        1000000039375000000000n
      );

      console.log("-----------------------after run f");
    });
  });
});
