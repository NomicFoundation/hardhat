/* eslint-disable import/no-unused-modules */
import { buildModule } from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import { useEphemeralIgnitionProject } from "../../test-helpers/use-ignition-project";

describe("index pattern deployments", function () {
  useEphemeralIgnitionProject("index-pattern-success");

  it("should succeed for a standard case", async function () {
    const Mod1 = buildModule("Mod1", (m) => {
      const F1 = m.contract("F1");

      m.call(F1, "first");

      return { F1 };
    });

    const Mod2 = buildModule("Mod2", (m) => {
      const { F1 } = m.useModule(Mod1);

      const F2 = m.contract("F2", [F1]);

      m.call(F2, "second");

      return { F2 };
    });

    const IndexMod = buildModule("IndexMod", (m) => {
      const { F2 } = m.useModule(Mod2);

      return { F2 };
    });

    const moduleDefinition = buildModule("DeployModule", (m) => {
      const { F1 } = m.useModule(Mod1);

      m.call(F1, "third", [], { after: [Mod1, IndexMod] });

      return { F1 };
    });

    await assert.isFulfilled(this.hre.ignition.deploy(moduleDefinition));
  });

  it("should succeed for a malaga case", async function () {
    const Mod1 = buildModule("Mod1", (m) => {
      const F1 = m.contract("F1");

      return { F1 };
    });

    const Mod2 = buildModule("Mod2", (m) => {
      const { F1 } = m.useModule(Mod1);

      const F2 = m.contract("F2", [F1]);

      const firstCall = m.call(F2, "unrelatedFunc");
      const secondCall = m.call(F2, "unrelatedFunc", [], {
        after: [firstCall],
        id: "secondCall",
      });
      const lastCall = m.call(F2, "unrelatedFunc", [], {
        after: [secondCall],
        id: "lastCall",
      });

      m.call(F2, "mustBeCalledByTwoSeparateContracts", [], {
        after: [lastCall],
      });

      return { F2 };
    });

    const Mod3 = buildModule("Mod3", (m) => {
      const { F1 } = m.useModule(Mod1);

      const F3 = m.contract("F2", [F1], { id: "F3" });

      return { F3 };
    });

    const IndexMod = buildModule("IndexMod", (m) => {
      const { F1 } = m.useModule(Mod1);
      const { F2 } = m.useModule(Mod2);
      const { F3 } = m.useModule(Mod3);

      const lastCall = m.call(F3, "mustBeCalledByTwoSeparateContracts");
      const NewF1 = m.contractAt("F1", F1, { after: [lastCall], id: "NewF1" });

      return { NewF1, F2, F3 };
    });

    const moduleDefinition = buildModule("DeployModule", (m) => {
      const { NewF1 } = m.useModule(IndexMod);

      m.call(NewF1, "throwsIfNotCalledTwice");

      return {};
    });

    await assert.isFulfilled(this.hre.ignition.deploy(moduleDefinition));
  });
});
