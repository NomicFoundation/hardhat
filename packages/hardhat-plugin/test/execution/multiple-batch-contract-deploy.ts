/* eslint-disable import/no-unused-modules */
import { buildModule } from "@ignored/ignition-core";
import { assert } from "chai";

import { useEphemeralIgnitionProject } from "../use-ignition-project";

import { sleep } from "./helpers";

/**
 * Deploy a multiple contracts over several batches.
 *
 * The intent here is to test batching.
 */
describe("execution - multiple batch contract deploy", function () {
  // TODO: rename back to minimal api once execution switched over
  useEphemeralIgnitionProject("minimal-new-api");

  it("should deploy over multiple batches", async function () {
    await this.hre.network.provider.request({
      method: "evm_setAutomine",
      params: [false],
    });

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

    const deployPromise = this.hre.ignition.deploy(moduleDefinition, {
      parameters: {},
    });

    await sleep(300);
    await this.hre.network.provider.send("evm_mine");

    await sleep(300);
    await this.hre.network.provider.send("evm_mine");

    await sleep(300);
    await this.hre.network.provider.send("evm_mine");

    const result = await deployPromise;

    const x1 = await result.contract1.x();
    const xA = await result.contractA.x();
    const x2 = await result.contract2.x();
    const xB = await result.contractB.x();
    const x3 = await result.contract3.x();
    const xC = await result.contractC.x();

    assert.equal(x1, Number(1));
    assert.equal(xA, Number(1));
    assert.equal(x2, Number(1));
    assert.equal(xB, Number(1));
    assert.equal(x3, Number(1));
    assert.equal(xC, Number(1));
  });
});
