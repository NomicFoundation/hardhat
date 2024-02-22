import { assert } from "chai";

import { HardhatContext } from "../../src/internal/context";
import { ERRORS } from "../../src/internal/core/errors-list";
import { resetHardhatContext } from "../../src/internal/reset";
import { useEnvironment } from "../helpers/environment";
import { expectHardhatError } from "../helpers/errors";
import { useFixtureProject } from "../helpers/project";

describe("Hardhat context", async function () {
  describe("no context", () => {
    it("context is not defined", async function () {
      assert.isFalse(HardhatContext.isCreated());
    });

    it("should throw when context isn't created", async function () {
      expectHardhatError(
        () => HardhatContext.getHardhatContext(),
        ERRORS.GENERAL.CONTEXT_NOT_CREATED
      );
    });
  });

  describe("create context but no environment", async function () {
    afterEach("reset context", function () {
      resetHardhatContext();
    });

    it("context is defined", async function () {
      HardhatContext.createHardhatContext();
      assert.isTrue(HardhatContext.isCreated());
    });

    it("context initialize properly", async function () {
      const ctx = HardhatContext.createHardhatContext();
      assert.isDefined(ctx.environmentExtenders);
      assert.isDefined(ctx.tasksDSL);
      assert.isUndefined(ctx.environment);
    });

    it("should throw when recreating hardhat context", async function () {
      HardhatContext.createHardhatContext();
      expectHardhatError(
        () => HardhatContext.createHardhatContext(),
        ERRORS.GENERAL.CONTEXT_ALREADY_CREATED
      );
    });

    it("should delete context", async function () {
      assert.isFalse(HardhatContext.isCreated());
      HardhatContext.createHardhatContext();
      assert.isTrue(HardhatContext.isCreated());
      HardhatContext.deleteHardhatContext();
      assert.isFalse(HardhatContext.isCreated());
    });

    it("should throw when HRE is not defined", async function () {
      const ctx = HardhatContext.createHardhatContext();
      expectHardhatError(
        () => ctx.getHardhatRuntimeEnvironment(),
        ERRORS.GENERAL.CONTEXT_HRE_NOT_DEFINED
      );
    });
  });

  describe("environment creates context", async function () {
    useFixtureProject("config-project");
    useEnvironment();
    it("should create context and set HRE into context", async function () {
      assert.strictEqual(
        HardhatContext.getHardhatContext().getHardhatRuntimeEnvironment(),
        this.env
      );
    });
    it("should throw when trying to set HRE", async function () {
      expectHardhatError(
        () =>
          HardhatContext.getHardhatContext().setHardhatRuntimeEnvironment(
            this.env
          ),
        ERRORS.GENERAL.CONTEXT_HRE_ALREADY_DEFINED
      );
    });
  });
});
