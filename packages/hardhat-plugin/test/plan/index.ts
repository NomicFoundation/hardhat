/* eslint-disable import/no-unused-modules */
import { buildRecipe } from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import { Renderer } from "../../src/plan";
import { useEnvironment } from "../useEnvironment";

describe.only("plan", () => {
  useEnvironment("minimal");

  it("should create a plan", async function () {
    await this.hre.run("compile", { quiet: true });

    const recipe = buildRecipe("MyRecipe", (m) => {
      const bar = m.contract("Bar");
      const usesContract = m.contract("UsesContract", {
        args: ["0x0000000000000000000000000000000000000000"],
      });

      m.call(usesContract, "setAddress", {
        args: [bar],
      });

      return { bar, usesContract };
    });

    const plan = await this.hre.ignition.plan(recipe);

    const renderer = new Renderer(plan, {
      cachePath: this.hre.config.paths.cache,
    });

    const output = renderer.getIndexOutput();

    // not sure this is the best way to test this, but it works for now
    assert(output.trim().startsWith("<html>"));
  });
});
