import { assert } from "chai";

import { BuidlerContext } from "../../src/internal/context";
import { ERRORS } from "../../src/internal/core/errors-list";
import { resetBuidlerContext } from "../../src/internal/reset";
import { useEnvironment } from "../helpers/environment";
import { expectHardhatError } from "../helpers/errors";
import { useFixtureProject } from "../helpers/project";

describe("Buidler context", async function () {
  describe("no context", () => {
    it("context is not defined", async function () {
      assert.isFalse(BuidlerContext.isCreated());
    });

    it("should throw when context isn't created", async function () {
      expectHardhatError(
        () => BuidlerContext.getBuidlerContext(),
        ERRORS.GENERAL.CONTEXT_NOT_CREATED
      );
    });
  });

  describe("create context but no environment", async function () {
    afterEach("reset context", function () {
      resetBuidlerContext();
    });

    it("context is defined", async function () {
      BuidlerContext.createBuidlerContext();
      assert.isTrue(BuidlerContext.isCreated());
    });

    it("context initialize properly", async function () {
      const ctx = BuidlerContext.createBuidlerContext();
      assert.isDefined(ctx.extendersManager);
      assert.isDefined(ctx.tasksDSL);
      assert.isUndefined(ctx.environment);
    });

    it("should throw when recreating buidler context", async function () {
      BuidlerContext.createBuidlerContext();
      expectHardhatError(
        () => BuidlerContext.createBuidlerContext(),
        ERRORS.GENERAL.CONTEXT_ALREADY_CREATED
      );
    });

    it("should delete context", async function () {
      assert.isFalse(BuidlerContext.isCreated());
      BuidlerContext.createBuidlerContext();
      assert.isTrue(BuidlerContext.isCreated());
      BuidlerContext.deleteBuidlerContext();
      assert.isFalse(BuidlerContext.isCreated());
    });

    it("should throw when HRE is not defined", async function () {
      const ctx = BuidlerContext.createBuidlerContext();
      expectHardhatError(
        () => ctx.getBuidlerRuntimeEnvironment(),
        ERRORS.GENERAL.CONTEXT_BRE_NOT_DEFINED
      );
    });
  });

  describe("environment creates context", async function () {
    useFixtureProject("config-project");
    useEnvironment();
    it("should create context and set HRE into context", async function () {
      assert.equal(
        BuidlerContext.getBuidlerContext().getBuidlerRuntimeEnvironment(),
        this.env
      );
    });
    it("should throw when trying to set HRE", async function () {
      expectHardhatError(
        () =>
          BuidlerContext.getBuidlerContext().setBuidlerRuntimeEnvironment(
            this.env
          ),
        ERRORS.GENERAL.CONTEXT_BRE_ALREADY_DEFINED
      );
    });
  });
});
