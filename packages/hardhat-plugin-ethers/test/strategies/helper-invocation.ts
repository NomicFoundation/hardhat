import { buildModule } from "@nomicfoundation/ignition-core";
import { assert } from "chai";
import { resetHardhatContext } from "hardhat/plugins-testing";
import path from "path";

describe("strategies - invocation via helper", () => {
  describe("no Hardhat config setup", () => {
    const fixtureProjectName = "minimal";

    beforeEach("Load environment", async function () {
      process.chdir(
        path.join(__dirname, "../fixture-projects", fixtureProjectName)
      );

      const hre = require("hardhat");

      await hre.network.provider.send("evm_setAutomine", [true]);
      await hre.run("compile", { quiet: true });

      this.hre = hre;
    });

    afterEach("reset hardhat context", function () {
      resetHardhatContext();
    });

    it("should execute create2 when passed config programmatically via helper", async function () {
      const moduleDefinition = buildModule("Module", (m) => {
        const foo = m.contract("Foo");

        return { foo };
      });

      const result = await this.hre.ignition.deploy(moduleDefinition, {
        strategy: "create2",
        strategyConfig: {
          salt: "test-salt",
        },
      });

      assert.equal(
        await result.foo.getAddress(),
        "0xDF310a91C604d3d525A999df6E01A8fFb3AEc406"
      );
    });

    it("should error on create2 when passed bad config", async function () {
      const moduleDefinition = buildModule("Module", (m) => {
        const foo = m.contract("Foo");

        return { foo };
      });

      await assert.isRejected(
        this.hre.ignition.deploy(moduleDefinition, {
          strategy: "create2",
          strategyConfig: {
            salt: undefined as any,
          },
        }),
        /IGN1102: Missing required strategy configuration parameter 'salt' for the strategy 'create2'/
      );
    });
  });

  describe("Hardhat config setup with create2 config", () => {
    const fixtureProjectName = "create2";

    beforeEach("Load environment", async function () {
      process.chdir(
        path.join(__dirname, "../fixture-projects", fixtureProjectName)
      );

      const hre = require("hardhat");

      await hre.network.provider.send("evm_setAutomine", [true]);
      await hre.run("compile", { quiet: true });

      this.hre = hre;
    });

    afterEach("reset hardhat context", function () {
      resetHardhatContext();
    });

    it("should execute create2 with the helper loading the Hardhat config", async function () {
      const moduleDefinition = buildModule("Module", (m) => {
        const foo = m.contract("Foo");

        return { foo };
      });

      const result = await this.hre.ignition.deploy(moduleDefinition, {
        strategy: "create2",
      });

      assert.equal(
        await result.foo.getAddress(),
        "0xDD35866eA6cdfC26eaaBb36b9C70A63d23992125"
      );
    });
  });
});
