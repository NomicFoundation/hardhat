/* eslint-disable import/no-unused-modules */
import {
  NamedArtifactContractDeploymentFuture,
  buildModule,
} from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import { IgnitionModuleResultsToViemContracts } from "../../src/ignition-module-results-to-viem-contracts";
import { useIgnitionProject } from "../test-helpers/use-ignition-project";

describe("deploy converts ignition named contract to viem instance", () => {
  useIgnitionProject("minimal");

  let result: IgnitionModuleResultsToViemContracts<
    string,
    {
      foo: NamedArtifactContractDeploymentFuture<"Foo">;
    }
  >;

  beforeEach(async function () {
    const moduleDefinition = buildModule("Module", (m) => {
      const foo = m.contract("Foo");

      return { foo };
    });

    result = await this.hre.ignition.deploy(moduleDefinition);
  });

  it("should provide the address", async function () {
    assert.equal(
      result.foo.address,
      "0x5FbDB2315678afecb367f032d93F642f64180aa3"
    );
  });

  it("should provide the abi", async function () {
    assert.isDefined(result.foo.abi);
  });

  it("should allow reading the contract instance", async function () {
    assert.equal(await result.foo.read.x(), 1n);
  });

  it("should allow writing to the contract instance", async function () {
    assert.equal(await result.foo.read.x(), 1n);

    await result.foo.write.inc();
    await result.foo.write.inc();

    assert.equal(await result.foo.read.x(), 3n);
  });

  it("should support simulating write function calls", async function () {
    const { result: addedNumberResult } =
      await result.foo.simulate.incByPositiveNumber([2n]);

    assert.equal(addedNumberResult, 3n);
  });

  it("should support gas estimation of write function calls", async function () {
    const estimation = await result.foo.estimateGas.inc();
    assert.isDefined(estimation);

    assert(typeof estimation === "bigint");
  });

  it("should support events", async function () {
    await result.foo.write.inc();

    const logs = await result.foo.getEvents.IncEvent();

    assert.equal(logs.length, 1);
    assert.equal(
      logs[0].args.sender,
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    );
  });

  it("should enforce the type is constrained to the contracts functions", async function () {
    await assert.isRejected(
      // @ts-expect-error
      result.foo.write.nonexistentWrite(),
      /Make sure you are using the correct ABI and that the function exists on it./
    );
    await assert.isRejected(
      // @ts-expect-error
      result.foo.read.nonexistentRead(),
      /Make sure you are using the correct ABI and that the function exists on it./
    );
    await assert.isRejected(
      // @ts-expect-error
      result.foo.estimateGas.nonexistentEstimate(),
      /Make sure you are using the correct ABI and that the function exists on it./
    );
    await assert.isRejected(
      // @ts-expect-error
      result.foo.simulate.nonexistentEstimate(),
      /Make sure you are using the correct ABI and that the function exists on it./
    );
  });
});
