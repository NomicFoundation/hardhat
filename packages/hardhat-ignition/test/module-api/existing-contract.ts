import { describe, it } from "node:test";

import { buildModule } from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project.js";

describe("existing contract", () => {
  const project = useEphemeralIgnitionProject("minimal");

  it("should be able to use an existing contract", async function () {
    await project.hre.tasks.getTask("build").run({ quiet: true });

    const barArtifact = await project.hre.artifacts.readArtifact("Bar");
    const usesContractArtifact =
      await project.hre.artifacts.readArtifact("UsesContract");

    const firstModuleDefinition = buildModule("FirstModule", (m) => {
      const bar = m.contract("Bar");
      const usesContract = m.contract("UsesContract", [
        "0x0000000000000000000000000000000000000000",
      ]);

      return { bar, usesContract };
    });

    const firstResult = await project.ignition.deploy(firstModuleDefinition);

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

    const result = await project.ignition.deploy(secondModuleDefinition);

    assert.isDefined(result.bar);
    assert.isDefined(result.usesContract);

    const usedAddress =
      (await result.usesContract.read.contractAddress()) as string;

    assert.equal(usedAddress.toLowerCase(), result.bar.address.toLowerCase());
  });
});
