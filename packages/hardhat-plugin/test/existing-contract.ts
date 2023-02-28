/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { deployModule } from "./helpers";
import { useEnvironment } from "./useEnvironment";

describe("existing contract", () => {
  useEnvironment("minimal");

  it("should be able to use an existing contract", async function () {
    await this.hre.run("compile", { quiet: true });

    const { abi: barAbi } = await this.hre.artifacts.readArtifact("Bar");
    const { abi: usesContractAbi } = await this.hre.artifacts.readArtifact(
      "UsesContract"
    );

    const firstResult = await deployModule(this.hre, (m) => {
      const bar = m.contract("Bar");
      const usesContract = m.contract("UsesContract", {
        args: ["0x0000000000000000000000000000000000000000"],
      });

      return { bar, usesContract };
    });

    assert.isDefined(firstResult.bar.address);
    assert.isDefined(firstResult.usesContract.address);
    const barAddress: string = firstResult.bar.address;
    const usesContractAddress: string = firstResult.usesContract.address;

    const result = await deployModule(this.hre, (m) => {
      const bar = m.contractAt("Bar", barAddress, barAbi);
      const usesContract = m.contractAt(
        "UsesContract",
        usesContractAddress,
        usesContractAbi
      );

      m.call(usesContract, "setAddress", {
        args: [bar],
      });

      return { bar, usesContract };
    });

    assert.isDefined(result.bar);
    assert.isDefined(result.usesContract);

    const usedAddress = await result.usesContract.contractAddress();

    assert.equal(usedAddress, result.bar.address);
  });
});
