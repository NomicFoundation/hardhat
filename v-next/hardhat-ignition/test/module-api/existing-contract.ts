/* eslint-disable import/no-unused-modules */
import { buildModule } from "@ignored/hardhat-vnext-ignition-core";
import { assert } from "chai";

import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project.js";

// TODO: Bring back with Hardhat 3 fixtures
describe.skip("existing contract", () => {
  useEphemeralIgnitionProject("minimal");

  it("should be able to use an existing contract", async function () {
    await this.hre.run("compile", { quiet: true });

    const barArtifact = await this.hre.artifacts.readArtifact("Bar");
    const usesContractArtifact =
      await this.hre.artifacts.readArtifact("UsesContract");

    const firstModuleDefinition = buildModule("FirstModule", (m) => {
      const bar = m.contract("Bar");
      const usesContract = m.contract("UsesContract", [
        "0x0000000000000000000000000000000000000000",
      ]);

      return { bar, usesContract };
    });

    const firstResult = await this.hre.ignition.deploy(firstModuleDefinition);

    const barAddress: string = firstResult.bar.address;
    const usesContractAddress: string = firstResult.usesContract.address;

    const secondModuleDefinition = buildModule("SecondModule", (m) => {
      const bar = m.contractAt("Bar", barArtifact, barAddress);
      const usesContract = m.contractAt(
        "UsesContract",
        usesContractArtifact,
        usesContractAddress,
      );

      m.call(usesContract, "setAddress", [bar]);

      return { bar, usesContract };
    });

    const result = await this.hre.ignition.deploy(secondModuleDefinition);

    assert.isDefined(result.bar);
    assert.isDefined(result.usesContract);

    const usedAddress =
      (await result.usesContract.read.contractAddress()) as string;

    assert.equal(usedAddress.toLowerCase(), result.bar.address.toLowerCase());
  });
});
