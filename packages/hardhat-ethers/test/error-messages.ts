import { assert, use } from "chai";
import chaiAsPromised from "chai-as-promised";

import { useEnvironment } from "./environment";

use(chaiAsPromised);

describe("error messages", function () {
  describe("in-process hardhat network", function () {
    useEnvironment("error-messages", "hardhat");

    runTests();
  });

  describe("hardhat node", function () {
    useEnvironment("error-messages", "localhost");

    runTests();
  });
});

function runTests() {
  beforeEach(async function () {
    await this.env.run("compile", {
      quiet: true,
    });
  });

  it("should return the right error message for a transaction that reverts with a reason string", async function () {
    const contract = await this.env.ethers.deployContract("Contract");

    await assert.isRejected(
      contract.revertsWithReasonString(),
      "reverted with reason string 'some reason'"
    );
  });

  it("should return the right error message for a transaction that reverts without a reason string", async function () {
    const contract = await this.env.ethers.deployContract("Contract");

    await assert.isRejected(
      contract.revertsWithoutReasonString(),
      "reverted without a reason string"
    );
  });

  it("should return the right error message for a transaction that reverts with an OOO", async function () {
    const contract = await this.env.ethers.deployContract("Contract");

    await assert.isRejected(
      contract.succeeds({
        gasLimit: 21_175,
      }),
      "ran out of gas"
    );
  });
}
