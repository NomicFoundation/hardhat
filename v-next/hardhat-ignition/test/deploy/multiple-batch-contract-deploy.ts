/* eslint-disable import/no-unused-modules */
import { buildModule } from "@ignored/hardhat-vnext-ignition-core";
import { assert } from "chai";

import { sleep } from "../test-helpers/sleep.js";
import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project.js";

/**
 * Deploy a multiple contracts over several batches.
 *
 * The intent here is to test batching.
 */
describe.skip("execution - multiple batch contract deploy", function () {
  useEphemeralIgnitionProject("minimal");

  it("should deploy over multiple batches", async function () {
    const moduleDefinition = buildModule("FooModule", (m) => {
      const contract1 = m.contract("Foo", [], { id: "Contract1" });
      const contractA = m.contract("Foo", [], { id: "ContractA" });

      const contract2 = m.contract("Foo", [], {
        id: "Contract2",
        after: [contract1],
      });
      const contractB = m.contract("Foo", [], {
        id: "ContractB",
        after: [contractA],
      });

      const contract3 = m.contract("Foo", [], {
        id: "Contract3",
        after: [contract2],
      });
      const contractC = m.contract("Foo", [], {
        id: "ContractC",
        after: [contractB],
      });

      return {
        contract1,
        contractA,
        contract2,
        contractB,
        contract3,
        contractC,
      };
    });

    const deployPromise = this.hre.ignition.deploy(moduleDefinition);

    await sleep(300);
    await this.connection.provider.request({ method: "evm_mine", params: [] });

    await sleep(300);
    await this.connection.provider.request({ method: "evm_mine", params: [] });

    await sleep(300);
    await this.connection.provider.request({ method: "evm_mine", params: [] });

    const result = await deployPromise;

    const x1 = await result.contract1.read.x();
    const xA = await result.contractA.read.x();
    const x2 = await result.contract2.read.x();
    const xB = await result.contractB.read.x();
    const x3 = await result.contract3.read.x();
    const xC = await result.contractC.read.x();

    assert.equal(x1, 1n);
    assert.equal(xA, 1n);
    assert.equal(x2, 1n);
    assert.equal(xB, 1n);
    assert.equal(x3, 1n);
    assert.equal(xC, 1n);
  });
});
