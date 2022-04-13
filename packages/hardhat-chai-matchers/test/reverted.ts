import { expect } from "chai";
import { useEnvironment, useEnvironmentWithNode } from "./helpers";

import "../src";

describe("INTEGRATION: Reverted", function () {
  describe("with the in-process hardhat network", function () {
    useEnvironment("hardhat-project");

    runTests();
  });

  describe("connected to a hardhat node", function () {
    useEnvironmentWithNode("hardhat-project");

    runTests();
  });

  function runTests() {
    const deployMatchers = async (hre: any) => {
      return (await hre.ethers.getContractFactory("Matchers")).deploy();
    };

    it("should pass if transaction reverts", async function () {
      const matchers = await deployMatchers(this.hre);

      await expect(matchers.revertsWithoutReasonString()).to.be.reverted;
    });

    it("should fail if transaction succeeds", async function () {
      const matchers = await deployMatchers(this.hre);

      await expect(expect(matchers.succeeds()).to.be.reverted).to.be.eventually
        .rejected;
    });

    describe("negated", function () {
      it("should pass if transaction succeeds", async function () {
        const matchers = await deployMatchers(this.hre);

        await expect(matchers.succeeds()).to.not.be.reverted;
      });

      it("should fail if transaction reverts", async function () {
        const matchers = await deployMatchers(this.hre);

        await expect(
          expect(matchers.revertsWithoutReasonString()).to.not.be.reverted
        ).to.be.eventually.rejected;
      });
    });
  }
});
