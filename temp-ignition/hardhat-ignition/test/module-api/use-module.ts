/* eslint-disable import/no-unused-modules */
import { buildModule } from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project";

describe("useModule", function () {
  useEphemeralIgnitionProject("minimal");

  describe("returning futures from module usage", () => {
    it("using useModule", async function () {
      const thirdPartyModule = buildModule("ThirdPartySubmodule", (m) => {
        const foo = m.contract("Foo");

        return { foo };
      });

      const userModule = buildModule("UserModule", (m) => {
        const { foo } = m.useModule(thirdPartyModule);

        m.call(foo, "inc");

        return { foo };
      });

      const result = await this.hre.ignition.deploy(userModule);

      assert.equal(await result.foo.read.x(), 2n);
    });
  });

  describe("modules depending on other modules contracts", () => {
    it("should execute all in a module before any that depends on a contract within the module", async function () {
      const firstSecondAndThirdModule = buildModule(
        "SecondAndThirdCallModule",
        (m) => {
          const trace = m.contract("Trace", ["first"]);

          const secondCall = m.call(trace, "addEntry", ["second"]);

          m.call(trace, "addEntry", ["third"], {
            id: "third_add_entry",
            after: [secondCall],
          });

          return { trace };
        }
      );

      const fourthCallModule = buildModule("FourthCallModule", (m) => {
        const { trace } = m.useModule(firstSecondAndThirdModule);

        m.call(trace, "addEntry", ["fourth"]);

        return { trace };
      });

      const userModule = buildModule("UserModule", (m) => {
        const { trace } = m.useModule(fourthCallModule);

        return { trace };
      });

      const result = await this.hre.ignition.deploy(userModule);

      const entry1 = await result.trace.read.entries([0n]);
      const entry2 = await result.trace.read.entries([1n]);
      const entry3 = await result.trace.read.entries([2n]);
      const entry4 = await result.trace.read.entries([3n]);

      assert.deepStrictEqual(
        [entry1, entry2, entry3, entry4],
        ["first", "second", "third", "fourth"]
      );
    });
  });
});
