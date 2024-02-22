import { assert } from "chai";
import { HARDHAT_NETWORK_NAME } from "hardhat/plugins";

import {
  getTruffleFixtureFunction,
  hasMigrations,
  hasTruffleFixture,
} from "../src/fixture";
import { RUN_TRUFFLE_FIXTURE_TASK } from "../src/task-names";

import { useEnvironment } from "./helpers";

describe("Truffle fixtures support", function () {
  describe("Migration detection", function () {
    describe("In a project without migrations", function () {
      useEnvironment("hardhat-project-solc-0.4", HARDHAT_NETWORK_NAME);

      it("Should not detect any", async function () {
        assert.isFalse(await hasMigrations(this.env.config.paths));
      });
    });

    describe("In a project with migrations", function () {
      useEnvironment("hardhat-project-with-migrations", HARDHAT_NETWORK_NAME);

      it("Should detect them", async function () {
        assert.isTrue(await hasMigrations(this.env.config.paths));
      });
    });
  });

  describe("Fixtures detection", function () {
    describe("In a project without fixture", function () {
      useEnvironment("hardhat-project-solc-0.4", HARDHAT_NETWORK_NAME);

      it("Should not detect any", async function () {
        assert.isFalse(await hasTruffleFixture(this.env.config.paths));
      });
    });

    describe("In a project with a js fixture", function () {
      useEnvironment("hardhat-project-with-fixture", HARDHAT_NETWORK_NAME);

      it("Should detect them", async function () {
        assert.isTrue(await hasTruffleFixture(this.env.config.paths));
      });
    });

    describe("In a project with a ts fixture", function () {
      useEnvironment("hardhat-project-with-ts-fixture", HARDHAT_NETWORK_NAME);

      it("Should detect them", async function () {
        assert.isTrue(await hasTruffleFixture(this.env.config.paths));
      });
    });
  });

  describe("Fixtures function loading", function () {
    describe("In a project with a js fixture", function () {
      useEnvironment("hardhat-project-with-fixture", HARDHAT_NETWORK_NAME);

      it("Should load it correctly", async function () {
        const fixture = await getTruffleFixtureFunction(this.env.config.paths);
        assert.isFunction(fixture);
      });
    });

    describe("In a project with a ts fixture", function () {
      useEnvironment("hardhat-project-with-ts-fixture", HARDHAT_NETWORK_NAME);

      it("Should load it correctly", async function () {
        const fixture = await getTruffleFixtureFunction(this.env.config.paths);
        assert.isFunction(fixture);
      });
    });

    describe("In an invalid fixture", function () {
      useEnvironment(
        "hardhat-project-with-invalid-fixture",
        HARDHAT_NETWORK_NAME
      );

      it("Should load it correctly", async function () {
        try {
          await getTruffleFixtureFunction(this.env.config.paths);
        } catch (error: any) {
          assert.include(error.message, "Truffle fixture file");
          assert.include(error.message, "must return a function");
          return;
        }

        assert.fail("Should have failed");
      });
    });
  });

  describe("Fixtures integration test", function () {
    useEnvironment("hardhat-project-solc-0.5", HARDHAT_NETWORK_NAME);

    it("Should detect deployed contracts", async function () {
      await this.env.run(RUN_TRUFFLE_FIXTURE_TASK);
      const Greeter = this.env.artifacts.require("Greeter");
      const greeter = await Greeter.deployed();

      assert.strictEqual(await greeter.greet(), "Hi");
    });

    it("Should give the right error on non-deployed contracts", async function () {
      await this.env.run(RUN_TRUFFLE_FIXTURE_TASK);
      const Lib = this.env.artifacts.require("Lib");

      try {
        await Lib.deployed();
      } catch (error: any) {
        assert.strictEqual(
          error.message,
          "Trying to get deployed instance of Lib, but none was set."
        );
        return;
      }

      assert.fail("Should have failed");
    });
  });
});
