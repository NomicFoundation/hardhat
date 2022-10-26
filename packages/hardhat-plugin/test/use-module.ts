/* eslint-disable import/no-unused-modules */
import {
  buildModule,
  buildRecipe,
  IRecipeGraphBuilder,
} from "@ignored/ignition-core";
import { isCallable } from "@ignored/ignition-core/src/utils/guards";
import { assert } from "chai";

import { mineBlocks } from "./helpers";
import { useEnvironment } from "./useEnvironment";

describe("useModule", function () {
  useEnvironment("minimal");

  describe("returning futures from module usage", () => {
    it("using useModule", async function () {
      await this.hre.run("compile", { quiet: true });

      const thirdPartyRecipe = buildRecipe(
        "ThirdPartyRecipe",
        (m: IRecipeGraphBuilder) => {
          const foo = m.contract("Foo");

          return { foo };
        }
      );

      const userModule = buildModule("UserModule", (m: IRecipeGraphBuilder) => {
        const { foo } = m.useRecipe(thirdPartyRecipe);

        m.call(foo, "inc", {
          args: [],
        });

        if (!isCallable(foo)) {
          throw new Error("Not callable");
        }

        return { foo };
      });

      const deployPromise = this.hre.ignition.deploy(userModule, {
        parameters: {},
        ui: false,
      });

      await mineBlocks(this.hre, [1, 1, 1], deployPromise);

      const result = await deployPromise;

      assert.isDefined(result);

      const x = await result.foo.x();

      assert.equal(x, Number(2));
    });
  });

  describe("passing futures into recipes", () => {
    it("using useRecipe", async function () {
      await this.hre.run("compile", { quiet: true });

      const thirdPartyRecipe = buildRecipe(
        "ThirdPartyRecipe",
        (m: IRecipeGraphBuilder) => {
          const foo = m.getParam("Foo");

          m.call(foo, "inc", {
            args: [],
          });

          return { foo };
        }
      );

      const userModule = buildModule("UserModule", (m: IRecipeGraphBuilder) => {
        const foo = m.contract("Foo");

        m.useRecipe(thirdPartyRecipe, {
          parameters: {
            Foo: foo,
          },
        });

        return { foo };
      });

      const deployPromise = this.hre.ignition.deploy(userModule, {
        parameters: {},
        ui: false,
      });

      await mineBlocks(this.hre, [1, 1, 1], deployPromise);

      const result = await deployPromise;

      assert.isDefined(result);

      const x = await result.foo.x();

      assert.equal(x, Number(2));
    });
  });

  describe("passing futures into and out of modules", () => {
    it("should allow ordering using returned futures", async function () {
      await this.hre.run("compile", { quiet: true });

      const addSecondAndThirdEntryRecipe = buildRecipe(
        "ThirdPartyRecipe",
        (m: IRecipeGraphBuilder) => {
          const trace = m.getParam("Trace");

          const secondCall = m.call(trace, "addEntry", {
            args: ["second"],
          });

          const thirdCall = m.call(trace, "addEntry", {
            args: ["third"],
            after: [secondCall],
          });

          return { thirdCall };
        }
      );

      const userModule = buildModule("UserModule", (m: IRecipeGraphBuilder) => {
        const trace = m.contract("Trace", {
          args: ["first"],
        });

        const { thirdCall } = m.useRecipe(addSecondAndThirdEntryRecipe, {
          parameters: {
            Trace: trace,
          },
        });

        m.call(trace, "addEntry", {
          args: ["fourth"],
          after: [thirdCall],
        });

        return { trace };
      });

      const deployPromise = this.hre.ignition.deploy(userModule, {
        parameters: {},
        ui: false,
      });

      await mineBlocks(this.hre, [1, 1, 1, 1], deployPromise);

      const result = await deployPromise;

      assert.isDefined(result);

      const entry1 = await result.trace.entries(0);
      const entry2 = await result.trace.entries(1);
      const entry3 = await result.trace.entries(2);
      const entry4 = await result.trace.entries(3);

      assert.deepStrictEqual(
        [entry1, entry2, entry3, entry4],
        ["first", "second", "third", "fourth"]
      );
    });

    it("should allow ordering based on the recipe overall", async function () {
      await this.hre.run("compile", { quiet: true });

      const addSecondAndThirdEntryRecipe = buildRecipe(
        "ThirdPartyRecipe",
        (m: IRecipeGraphBuilder) => {
          const trace = m.getParam("Trace");

          const secondCall = m.call(trace, "addEntry", {
            args: ["second"],
          });

          m.call(trace, "addEntry", {
            args: ["third"],
            after: [secondCall],
          });

          return { secondCall };
        }
      );

      const userModule = buildModule("UserModule", (m: IRecipeGraphBuilder) => {
        const trace = m.contract("Trace", {
          args: ["first"],
        });

        const { recipe } = m.useRecipe(addSecondAndThirdEntryRecipe, {
          parameters: {
            Trace: trace,
          },
        });

        m.call(trace, "addEntry", {
          args: ["fourth"],
          after: [recipe],
        });

        return { trace };
      });

      const deployPromise = this.hre.ignition.deploy(userModule, {
        parameters: {},
        ui: false,
      });

      await mineBlocks(this.hre, [1, 1, 1, 1], deployPromise);

      const result = await deployPromise;

      assert.isDefined(result);

      const entry1 = await result.trace.entries(0);
      const entry2 = await result.trace.entries(1);
      const entry3 = await result.trace.entries(2);
      const entry4 = await result.trace.entries(3);

      assert.deepStrictEqual(
        [entry1, entry2, entry3, entry4],
        ["first", "second", "third", "fourth"]
      );
    });
  });
});
