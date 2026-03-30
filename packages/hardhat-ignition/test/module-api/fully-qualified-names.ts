import { buildModule } from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project.js";

describe("fully qualified names", () => {
  describe("where there are multiple contracts with the same name in the project", () => {
    useEphemeralIgnitionProject("multiple-contracts-with-same-name");

    it("should deploy contracts by referring using fully qualified names", async function () {
      const LaunchModule = buildModule("Apollo", (m) => {
        const rocket1 = m.contract(
          "contracts/Rocket1.sol:Rocket",
          ["Rocket 1"],
          {
            id: "Rocket1",
          },
        );
        const rocket2 = m.contract(
          "contracts/Rocket2.sol:Rocket",
          ["Rocket 2"],
          {
            id: "Rocket2",
          },
        );

        return { rocket1, rocket2 };
      });

      const result = await this.ignition.deploy(LaunchModule);

      assert.equal(await result.rocket1.read.name(), "Rocket 1");
      assert.equal(await result.rocket2.read.name(), "Rocket 2");
    });
  });
});
