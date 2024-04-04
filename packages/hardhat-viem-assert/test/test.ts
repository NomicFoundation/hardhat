import { expect } from "../src/index.js";
import { useEnvironment } from "./helpers.js";

declare module "hardhat/types" {
  interface HardhatRuntimeEnvironment {
    viem: any;
  }
}

describe("hardhat-toolbox-viem", function () {
  describe("only-toolbox", function () {
    useEnvironment("hardhat-project");

    it("has all the expected things in the HRE", async function () {
      const [bobWalletClient, aliceWalletClient] =
        await this.env.viem.getWalletClients();

      const publicClient = await this.env.viem.getPublicClient();

      await expect(async () => {
        console.log("run f");

        const hash = await bobWalletClient.sendTransaction({
          to: aliceWalletClient.account.address,
          value: 1000000000000000000000n,
        });

        await publicClient.waitForTransactionReceipt({ hash });
      }).to.changeEtherBalance(
        publicClient,
        bobWalletClient.account.address,
        1000000039375000000000n
      );

      console.log("-----------------------after run f");
    });
  });
});
