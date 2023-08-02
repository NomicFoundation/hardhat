/* eslint-disable import/no-unused-modules */
import { buildModule } from "@ignored/ignition-core";
import { assert } from "chai";

import { useEphemeralIgnitionProject } from "./use-ignition-project";

describe("useModule", function () {
  useEphemeralIgnitionProject("minimal-new-api");

  describe("returning futures from module usage", () => {
    it("using useModule", async function () {
      await this.hre.run("compile", { quiet: true });

      const thirdPartyModule = buildModule("ThirdPartySubmodule", (m) => {
        const foo = m.contract("Foo");

        return { foo };
      });

      const userModule = buildModule("UserModule", (m) => {
        const { foo } = m.useModule(thirdPartyModule);

        m.call(foo, "inc");

        return { foo };
      });

      const result = await this.deploy(userModule);

      assert.equal(await result.foo.x(), Number(2));
    });
  });

  describe("modules depending on other modules contracts", () => {
    it("should execute all in a module before any that depends on a contract within the module", async function () {
      await this.hre.run("compile", { quiet: true });

      const firstSecondAndThirdModule = buildModule(
        "SecondAndThirdCallModule",
        (m) => {
          const trace = m.contract("Trace", ["first"]);

          const secondCall = m.call(trace, "addEntry", ["second"]);

          m.call(trace, "addEntry", ["third"], {
            id: "third-add-entry",
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

      const result = await this.deploy(userModule);

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
