import { buildModule } from "@nomicfoundation/ignition-core";
import { assert } from "chai";
import { resetHardhatContext } from "hardhat/plugins-testing";
import path from "path";

describe("strategies - invocation via helper", () => {
  const example32ByteSalt =
    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

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
          salt: example32ByteSalt,
        },
      });

      assert.equal(
        await result.foo.getAddress(),
        "0x647fB9ef6cd97537C553f6cC3c7f60395f81b410"
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
        "0x8C1c4E6Fd637C7aa7165F19beFeAEab5E53095Bf"
      );
    });
  });
});
