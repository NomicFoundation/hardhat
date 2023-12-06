/* eslint-disable import/no-unused-modules */
import { buildModule } from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project";

describe("module parameters", () => {
  useEphemeralIgnitionProject("minimal");

  it("should be able to retrieve a default number", async function () {
    const moduleDefinition = buildModule("WithDefaultModule", (m) => {
      const myNumber = m.getParameter("MyNumber", 42);

      const foo = m.contract("Foo");

      m.call(foo, "incByPositiveNumber", [myNumber]);

      return { foo };
    });

    const result = await this.hre.ignition.deploy(moduleDefinition);

    const v = await result.foo.read.x();

    assert.equal(v, 43n);
  });

  it("should be able to override a default number", async function () {
    const moduleDefinition = buildModule("WithDefaultModule", (m) => {
      const myNumber = m.getParameter("MyNumber", 10);

      const foo = m.contract("Foo");

      m.call(foo, "incByPositiveNumber", [myNumber]);

      return { foo };
    });

    const result = await this.hre.ignition.deploy(moduleDefinition, {
      parameters: {
        WithDefaultModule: {
          MyNumber: 20,
        },
      },
    });

    assert.equal(await result.foo.read.x(), 21n);
  });

  it("should be able to retrieve a default string", async function () {
    const moduleDefinition = buildModule("WithDefaultStringModule", (m) => {
      const myString = m.getParameter("MyString", "Example");

      const greeter = m.contract("Greeter", [myString]);

      return { greeter };
    });

    const result = await this.hre.ignition.deploy(moduleDefinition);

    const v = await result.greeter.read.getGreeting();

    assert.equal(v, "Example");
  });

  it("should be able to override a default string", async function () {
    const moduleDefinition = buildModule("WithDefaultStringModule", (m) => {
      const myString = m.getParameter("MyString", "Example");

      const greeter = m.contract("Greeter", [myString]);

      return { greeter };
    });

    const result = await this.hre.ignition.deploy(moduleDefinition, {
      parameters: {
        WithDefaultStringModule: {
          MyString: "NotExample",
        },
      },
    });

    assert.equal(await result.greeter.read.getGreeting(), "NotExample");
  });
});

describe("params validation", () => {
  useEphemeralIgnitionProject("minimal");

  it("should throw if no parameters object provided", async function () {
    await this.hre.run("compile", { quiet: true });

    const userModule = buildModule("UserModule", (m) => {
      const myNumber = m.getParameter("MyNumber");

      const foo = m.contract("Foo");

      m.call(foo, "incByPositiveNumber", [myNumber]);

      return { foo };
    });

    const deployPromise = this.hre.ignition.deploy(userModule);

    await assert.isRejected(
      deployPromise,
      "Module parameter 'MyNumber' requires a value but was given none"
    );
  });

  it("should throw if parameter missing from parameters", async function () {
    await this.hre.run("compile", { quiet: true });

    const userModule = buildModule("UserModule", (m) => {
      const myNumber = m.getParameter("MyNumber");

      const foo = m.contract("Foo");

      m.call(foo, "incByPositiveNumber", [myNumber]);

      return { foo };
    });

    const deployPromise = this.hre.ignition.deploy(userModule, {
      parameters: {
        UserModule: {
          NotMyNumber: 11,
        },
      },
    });

    await assert.isRejected(
      deployPromise,
      "Module parameter 'MyNumber' requires a value but was given none"
    );
  });
});
