import { buildModule, ModuleDefinition } from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import { mineBlocks } from "./helpers";
import { useEnvironment } from "./useEnvironment";

describe("params", () => {
  useEnvironment("minimal");

  describe("required", () => {
    it("should be able to retrieve a number", async function () {
      const result = await deployModule(
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
      const result = await deployModule(
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
      const result = await deployModule(this.hre, (m) => {
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
      const result = await deployModule(
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
      const result = await deployModule(this.hre, (m) => {
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
      const result = await deployModule(
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

      const userModule = buildModule("MyModule", (m) => {
        const myNumber = m.getParam("MyNumber");

        const foo = m.contract("Foo");

        m.call(foo, "incByPositiveNumber", {
          args: [myNumber],
        });

        return { foo };
      });

      const deployPromise = this.hre.ignition.deploy(userModule, {});

      await mineBlocks(this.hre, [1, 1], deployPromise);

      await assert.isRejected(
        deployPromise,
        'No parameters object provided to deploy options, but module requires parameter "MyNumber"'
      );
    });

    it("should throw if parameter missing from parameters", async function () {
      await this.hre.run("compile", { quiet: true });

      const userModule = buildModule("MyModule", (m) => {
        const myNumber = m.getParam("MyNumber");

        const foo = m.contract("Foo");

        m.call(foo, "incByPositiveNumber", {
          args: [myNumber],
        });

        return { foo };
      });

      const deployPromise = this.hre.ignition.deploy(userModule, {
        parameters: {
          NotMyNumber: 11,
        },
      });

      await mineBlocks(this.hre, [1, 1], deployPromise);

      await assert.isRejected(
        deployPromise,
        'No parameter provided for "MyNumber"'
      );
    });

    it("should ban multiple params with the same name", async function () {
      await this.hre.run("compile", { quiet: true });

      const userModule = buildModule("MyModule", (m) => {
        const myNumber = m.getParam("MyNumber");
        const myNumber2 = m.getParam("MyNumber");

        const foo = m.contract("Foo");

        m.call(foo, "incTwoNumbers", {
          args: [myNumber, myNumber2],
        });

        return { foo };
      });

      const deployPromise = this.hre.ignition.deploy(userModule, {
        parameters: {
          NotMyNumber: 11,
        },
      });

      await mineBlocks(this.hre, [1, 1], deployPromise);

      await assert.isRejected(
        deployPromise,
        'A parameter should only be retrieved once, but found more than one call to getParam for "MyNumber"'
      );
    });

    it("should ban multiple optional params with the same name", async function () {
      await this.hre.run("compile", { quiet: true });

      const userModule = buildModule("MyModule", (m) => {
        const myNumber = m.getOptionalParam("MyNumber", 11);
        const myNumber2 = m.getOptionalParam("MyNumber", 12);

        const foo = m.contract("Foo");

        m.call(foo, "incTwoNumbers", {
          args: [myNumber, myNumber2],
        });

        return { foo };
      });

      const deployPromise = this.hre.ignition.deploy(userModule, {
        parameters: {
          NotMyNumber: 11,
        },
      });

      await mineBlocks(this.hre, [1, 1], deployPromise);

      await assert.isRejected(
        deployPromise,
        'An optional parameter should only be retrieved once, but found more than one call to getParam for "MyNumber"'
      );
    });
  });
});

async function deployModule<T>(
  hre: any,
  moduleDefinition: ModuleDefinition<T>,
  options?: { parameters: {} }
): Promise<any> {
  await hre.run("compile", { quiet: true });

  const userModule = buildModule("MyModule", moduleDefinition);

  const deployPromise = hre.ignition.deploy(userModule, options);

  await mineBlocks(hre, [1, 1], deployPromise);

  const result = await deployPromise;

  return result;
}
