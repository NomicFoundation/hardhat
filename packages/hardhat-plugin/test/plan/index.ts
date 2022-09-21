/* eslint-disable import/no-unused-modules */
import { buildRecipe } from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import { Renderer } from "../../src/plan";
import { useEnvironment } from "../useEnvironment";

describe("plan", () => {
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

    // a little hacky, but it works *shrug*
    assert.equal(
      renderer.getIndexOutput().replace(/\s/g, ""),
      planOutput.replace(/\s/g, "")
    );
  });
});

const planOutput = `
<html>
  <body>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <script>
      mermaid.initialize({ startOnLoad: true, securityLevel: "loose" });
    </script>

<div class="mermaid">

flowchart
subgraph RecipeGraph
direction TB
0[Bar]
1[UsesContract]
2[UsesContract/setAddress]
0 --> 2
1 --> 2
click 0 "/Users/morgan/ignition/packages/hardhat-plugin/test/fixture-projects/minimal/cache/plan/recipe/0.json" _self
click 1 "/Users/morgan/ignition/packages/hardhat-plugin/test/fixture-projects/minimal/cache/plan/recipe/1.json" _self
click 2 "/Users/morgan/ignition/packages/hardhat-plugin/test/fixture-projects/minimal/cache/plan/recipe/2.json" _self
end

</div>


<div class="mermaid">

flowchart
subgraph ExecutionGraph
direction TB
0[Bar]
1[UsesContract]
2[UsesContract/setAddress]
0 --> 2
1 --> 2
click 0 "/Users/morgan/ignition/packages/hardhat-plugin/test/fixture-projects/minimal/cache/plan/execution/0.json" _self
click 1 "/Users/morgan/ignition/packages/hardhat-plugin/test/fixture-projects/minimal/cache/plan/execution/1.json" _self
click 2 "/Users/morgan/ignition/packages/hardhat-plugin/test/fixture-projects/minimal/cache/plan/execution/2.json" _self
end

</div>

  </body>
</html>`;
