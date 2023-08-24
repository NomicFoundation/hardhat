/* eslint-disable import/no-unused-modules */
import { buildModule } from "@ignored/ignition-core";
import { assert } from "chai";

import { useEphemeralIgnitionProject } from "./use-ignition-project";

describe("existing contract", () => {
  useEphemeralIgnitionProject("minimal-new-api");

  it("should be able to use an existing contract", async function () {
    await this.hre.run("compile", { quiet: true });

    const barArtifact = await this.hre.artifacts.readArtifact("Bar");
    const usesContractArtifact = await this.hre.artifacts.readArtifact(
      "UsesContract"
    );

    const firstModuleDefinition = buildModule("FirstModule", (m) => {
      const bar = m.contract("Bar");
      const usesContract = m.contract("UsesContract", [
        "0x0000000000000000000000000000000000000000",
      ]);

      return { bar, usesContract };
    });

    const firstResult = await this.deploy(firstModuleDefinition);

    const barAddress: string = await firstResult.bar.getAddress();
    const usesContractAddress: string =
      await firstResult.usesContract.getAddress();

    const secondModuleDefinition = buildModule("SecondModule", (m) => {
      const bar = m.contractAt("Bar", barAddress, barArtifact);
      const usesContract = m.contractAt(
        "UsesContract",
        usesContractAddress,
        usesContractArtifact
      );

      m.call(usesContract, "setAddress", [bar]);

      return { bar, usesContract };
    });

    const result = await this.deploy(secondModuleDefinition);

    assert.isDefined(result.bar);
    assert.isDefined(result.usesContract);

    const usedAddress = await result.usesContract.contractAddress();

    assert.equal(
      usedAddress.toLowerCase(),
      (await result.bar.getAddress()).toLowerCase()
    );
  });
});
