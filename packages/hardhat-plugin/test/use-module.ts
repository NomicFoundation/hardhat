/* eslint-disable import/no-unused-modules */
import { buildModule, IDeploymentBuilder } from "@ignored/ignition-core";
import { assert } from "chai";

import { mineBlocks } from "./helpers";
import { useEnvironment } from "./useEnvironment";

describe("useModule", function () {
  useEnvironment("minimal");

  describe("returning futures from module usage", () => {
    it("using useModule", async function () {
      await this.hre.run("compile", { quiet: true });

      const thirdPartyModule = buildModule(
        "ThirdPartySubmodule",
        (m: IDeploymentBuilder) => {
          const foo = m.contract("Foo");

          return { foo };
        }
      );

      const userModule = buildModule("UserModule", (m: IDeploymentBuilder) => {
        const { foo } = m.useModule(thirdPartyModule);

        m.call(foo, "inc", {
          args: [],
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

  describe("passing futures into submodules", () => {
    it("using useModule", async function () {
      await this.hre.run("compile", { quiet: true });

      const thirdPartySubmodule = buildModule("ThirdPartySubmodule", (m) => {
        const foo = m.getParam("Foo");

        m.call(foo, "inc", {
          args: [],
        });

        return {};
      });

      const userModule = buildModule("UserModule", (m: IDeploymentBuilder) => {
        const foo = m.contract("Foo");

        m.useModule(thirdPartySubmodule, {
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

  describe("modules depending on modules", () => {
    it("should allow ordering using returned futures", async function () {
      await this.hre.run("compile", { quiet: true });

      const addSecondAndThirdEntryModule = buildModule(
        "SecondAndThirdCallModule",
        (m) => {
          const trace = m.getParam("Trace");

          const secondCall = m.call(trace, "addEntry", {
            args: ["second"],
          });

          m.call(trace, "addEntry", {
            args: ["third"],
            after: [secondCall],
          });

          return {};
        }
      );

      const fourthCallModule = buildModule("FourthCallModule", (m) => {
        const trace = m.getParam("Trace");

        m.call(trace, "addEntry", {
          args: ["fourth"],
        });

        return {};
      });

      const userModule = buildModule("UserModule", (m: IDeploymentBuilder) => {
        const trace = m.contract("Trace", {
          args: ["first"],
        });

        const secondAndThirdModule = m.useModule(addSecondAndThirdEntryModule, {
          parameters: {
            Trace: trace,
          },
        });

        m.useModule(fourthCallModule, {
          parameters: {
            Trace: trace,
          },
          after: [secondAndThirdModule],
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

  describe("modules depending on other modules contracts", () => {
    it("should execute all in a module before any that depends on a contract within the module", async function () {
      await this.hre.run("compile", { quiet: true });

      const firstSecondAndThirdModule = buildModule(
        "SecondAndThirdCallModule",
        (m) => {
          const trace = m.contract("Trace", {
            args: ["first"],
          });

          const secondCall = m.call(trace, "addEntry", {
            args: ["second"],
          });

          m.call(trace, "addEntry", {
            args: ["third"],
            after: [secondCall],
          });

          return { trace };
        }
      );

      const fourthCallModule = buildModule("FourthCallModule", (m) => {
        const { trace } = m.useModule(firstSecondAndThirdModule);

        m.call(trace, "addEntry", {
          args: ["fourth"],
        });

        return { trace };
      });

      const userModule = buildModule("UserModule", (m: IDeploymentBuilder) => {
        const { trace } = m.useModule(fourthCallModule, {});

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
