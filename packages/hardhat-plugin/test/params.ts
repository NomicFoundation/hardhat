/* eslint-disable import/no-unused-modules */
import { defineModule } from "@ignored/ignition-core";
import { assert } from "chai";

import { useEphemeralIgnitionProject } from "./use-ignition-project";

describe("module parameters", () => {
  useEphemeralIgnitionProject("minimal-new-api");

  it("should be able to retrieve a default number", async function () {
    const moduleDefinition = defineModule("WithDefaultModule", (m) => {
      const myNumber = m.getParameter("MyNumber", 42);

      const foo = m.contract("Foo");

      m.call(foo, "incByPositiveNumber", [myNumber]);

      return { foo };
    });

    const result = await this.deploy(moduleDefinition);

    const v = await result.foo.x();

    assert.equal(v, Number(43));
  });

  it("should be able to override a default number", async function () {
    const moduleDefinition = defineModule("WithDefaultModule", (m) => {
      const myNumber = m.getParameter("MyNumber", 10);

      const foo = m.contract("Foo");

      m.call(foo, "incByPositiveNumber", [myNumber]);

      return { foo };
    });

    const result = await this.deploy(moduleDefinition, {
      WithDefaultModule: {
        MyNumber: 20,
      },
    });

    assert.equal(await result.foo.x(), Number(21));
  });

  it("should be able to retrieve a default string", async function () {
    const moduleDefinition = defineModule("WithDefaultStringModule", (m) => {
      const myString = m.getParameter("MyString", "Example");

      const greeter = m.contract("Greeter", [myString]);

      return { greeter };
    });

    const result = await this.deploy(moduleDefinition);

    const v = await result.greeter.getGreeting();

    assert.equal(v, "Example");
  });

  it("should be able to override a default string", async function () {
    const moduleDefinition = defineModule("WithDefaultStringModule", (m) => {
      const myString = m.getParameter("MyString", "Example");

      const greeter = m.contract("Greeter", [myString]);

      return { greeter };
    });

    const result = await this.deploy(moduleDefinition, {
      WithDefaultStringModule: {
        MyString: "NotExample",
      },
    });

    assert.equal(await result.greeter.getGreeting(), "NotExample");
  });
});

// TODO: bring back with parameter validation
describe.skip("validation", () => {
  useEphemeralIgnitionProject("minimal-new-api");

  it("should throw if no parameters object provided", async function () {
    await this.hre.run("compile", { quiet: true });

    const userModule = defineModule("UserModule", (m) => {
      const myNumber = m.getParameter("MyNumber");

      const foo = m.contract("Foo");

      m.call(foo, "incByPositiveNumber", [myNumber]);

      return { foo };
    });

    const deployPromise = this.hre.ignition2.deploy(userModule);

    await assert.isRejected(
      deployPromise,
      'No parameters object provided to deploy options, but module requires parameter "MyNumber"'
    );
  });

  it("should throw if parameter missing from parameters", async function () {
    await this.hre.run("compile", { quiet: true });

    const userModule = defineModule("UserModule", (m) => {
      const myNumber = m.getParameter("MyNumber");

      const foo = m.contract("Foo");

      m.call(foo, "incByPositiveNumber", [myNumber]);

      return { foo };
    });

    const deployPromise = this.hre.ignition2.deploy(userModule, {
      parameters: {
        UserModule: {
          NotMyNumber: 11,
        },
      },
    });

    await assert.isRejected(
      deployPromise,
      'No parameter provided for "MyNumber"'
    );
  });
});
