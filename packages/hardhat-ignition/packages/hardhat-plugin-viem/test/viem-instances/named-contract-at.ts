import {
  NamedArtifactContractAtFuture,
  buildModule,
} from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import { IgnitionModuleResultsToViemContracts } from "../../src/ignition-module-results-to-viem-contracts";
import { useIgnitionProject } from "../test-helpers/use-ignition-project";

describe("deploy converts ignition named contractAt to viem instance", () => {
  useIgnitionProject("minimal");

  let result: IgnitionModuleResultsToViemContracts<
    string,
    {
      contractAtFoo: NamedArtifactContractAtFuture<"Foo">;
    }
  >;

  beforeEach(async function () {
    const moduleDefinition = buildModule("Module", (m) => {
      const foo = m.contract("Foo");
      const contractAtFoo = m.contractAt("Foo", foo, { id: "ContractAtFoo" });

      return { contractAtFoo };
    });

    result = await this.hre.ignition.deploy(moduleDefinition);
  });

  it("should provide the address", async function () {
    assert.equal(
      result.contractAtFoo.address,
      "0x5FbDB2315678afecb367f032d93F642f64180aa3"
    );
  });

  it("should provide the abi", async function () {
    assert.isDefined(result.contractAtFoo.abi);
  });

  it("should allow reading the contract instance", async function () {
    assert.equal(await result.contractAtFoo.read.x(), 1n);
  });

  it("should allow writing to the contract instance", async function () {
    assert.equal(await result.contractAtFoo.read.x(), 1n);

    await result.contractAtFoo.write.inc();
    await result.contractAtFoo.write.inc();

    assert.equal(await result.contractAtFoo.read.x(), 3n);
  });

  it("should support simulating write function calls", async function () {
    const { result: addedNumberResult } =
      await result.contractAtFoo.simulate.incByPositiveNumber([2n]);

    assert.equal(addedNumberResult, 3n);
  });

  it("should support gas estimation of write function calls", async function () {
    const estimation = await result.contractAtFoo.estimateGas.inc();

    assert.isDefined(estimation);
    assert(typeof estimation === "bigint");
  });

  it("should support events", async function () {
    await result.contractAtFoo.write.inc();

    const logs = await result.contractAtFoo.getEvents.IncEvent();

    assert.equal(logs.length, 1);
    assert.equal(
      logs[0].args.sender,
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    );
  });

  it("should enforce the type is constrained to the contracts functions", async function () {
    await assert.isRejected(
      // @ts-expect-error
      result.contractAtFoo.write.nonexistantWrite(),
      /Make sure you are using the correct ABI and that the function exists on it./
    );
    await assert.isRejected(
      // @ts-expect-error
      result.contractAtFoo.read.nonexistantRead(),
      /Make sure you are using the correct ABI and that the function exists on it./
    );
    await assert.isRejected(
      // @ts-expect-error
      result.contractAtFoo.estimateGas.nonexistantEstimate(),
      /Make sure you are using the correct ABI and that the function exists on it./
    );
    await assert.isRejected(
      // @ts-expect-error
      result.contractAtFoo.simulate.nonexistantEstimate(),
      /Make sure you are using the correct ABI and that the function exists on it./
    );
  });
});
