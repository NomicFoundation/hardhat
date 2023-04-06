import { useEnvironment } from "../helpers";

describe("verify task", function () {
  this.timeout(1000000);

  before(function () {
    if (process.env.RUN_ETHERSCAN_TESTS !== "yes") {
      this.skip();
    } else {
      if (
        process.env.WALLET_PRIVATE_KEY === undefined ||
        process.env.WALLET_PRIVATE_KEY === ""
      ) {
        throw new Error("missing WALLET_PRIVATE_KEY env variable");
      }
    }
  });

  describe("verify:process-arguments", () => {
    useEnvironment("hardhat-project-undefined-config");
  });
});
