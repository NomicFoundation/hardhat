/* eslint-disable import/no-unused-modules */
import { buildRecipe } from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import { deployRecipe, mineBlocks } from "./helpers";
import { useEnvironment } from "./useEnvironment";

describe("recipe parameters", () => {
  useEnvironment("minimal");

  describe("required", () => {
    it("should be able to retrieve a number", async function () {
      const result = await deployRecipe(
        this.hre,
        (m) => {
          const myNumber = m.getParam("MyNumber");

          const foo = m.contract("Foo");

          m.call(foo, "incByPositiveNumber", {
            args: [myNumber],
          });

          return { foo };
        },
        {
          parameters: {
            MyNumber: 123,
          },
        }
      );

      const v = await result.foo.x();

      assert.equal(v, Number(124));
    });

    it("should be able to retrieve a string", async function () {
      const result = await deployRecipe(
        this.hre,
        (m) => {
          const myString = m.getParam("MyString");

          const greeter = m.contract("Greeter", {
            args: [myString],
          });

          return { greeter };
        },
        {
          parameters: {
            MyString: "Example",
          },
        }
      );

      const v = await result.greeter.getGreeting();

      assert.equal(v, "Example");
    });
  });

  describe("optional", () => {
    it("should be able to retrieve a default number", async function () {
      const result = await deployRecipe(this.hre, (m) => {
        const myNumber = m.getOptionalParam("MyNumber", 42);

        const foo = m.contract("Foo");

        m.call(foo, "incByPositiveNumber", {
          args: [myNumber],
        });

        return { foo };
      });

      // then
      const v = await result.foo.x();

      assert.equal(v, Number(43));
    });

    it("should be able to override a default number", async function () {
      const result = await deployRecipe(
        this.hre,
        (m) => {
          const myNumber = m.getOptionalParam("MyNumber", 10);

          const foo = m.contract("Foo");

          m.call(foo, "incByPositiveNumber", {
            args: [myNumber],
          });

          return { foo };
        },
        {
          parameters: {
            MyNumber: 20,
          },
        }
      );

      // then
      const v = await result.foo.x();

      assert.equal(v, Number(21));
    });

    it("should be able to retrieve a default string", async function () {
      const result = await deployRecipe(this.hre, (m) => {
        const myString = m.getOptionalParam("MyString", "Example");

        const greeter = m.contract("Greeter", {
          args: [myString],
        });

        return { greeter };
      });

      const v = await result.greeter.getGreeting();

      assert.equal(v, "Example");
    });

    it("should be able to override a default string", async function () {
      const result = await deployRecipe(
        this.hre,
        (m) => {
          const myString = m.getOptionalParam("MyString", "Example");

          const greeter = m.contract("Greeter", {
            args: [myString],
          });

          return { greeter };
        },
        {
          parameters: {
            MyString: "NotExample",
          },
        }
      );

      // then
      const v = await result.greeter.getGreeting();

      assert.equal(v, "NotExample");
    });
  });

  describe("validation", () => {
    it("should throw if no parameters object provided", async function () {
      await this.hre.run("compile", { quiet: true });

      const userRecipe = buildRecipe("MyRecipe", (m) => {
        const myNumber = m.getParam("MyNumber");

        const foo = m.contract("Foo");

        m.call(foo, "incByPositiveNumber", {
          args: [myNumber],
        });

        return { foo };
      });

      const deployPromise = this.hre.ignition.deploy(userRecipe, { ui: false });

      await mineBlocks(this.hre, [1, 1], deployPromise);

      await assert.isRejected(
        deployPromise,
        'No parameters object provided to deploy options, but recipe requires parameter "MyNumber"'
      );
    });

    it("should throw if parameter missing from parameters", async function () {
      await this.hre.run("compile", { quiet: true });

      const userRecipe = buildRecipe("MyRecipe", (m) => {
        const myNumber = m.getParam("MyNumber");

        const foo = m.contract("Foo");

        m.call(foo, "incByPositiveNumber", {
          args: [myNumber],
        });

        return { foo };
      });

      const deployPromise = this.hre.ignition.deploy(userRecipe, {
        parameters: {
          NotMyNumber: 11,
        },
        ui: false,
      });

      await mineBlocks(this.hre, [1, 1], deployPromise);

      await assert.isRejected(
        deployPromise,
        'No parameter provided for "MyNumber"'
      );
    });
  });
});
