import type { IgnitionModuleResultsToViemContracts } from "../../src/types.js";
import type { ContractAtFuture } from "@nomicfoundation/ignition-core";

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

import {
  assertRejects,
  useEphemeralFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";
import { buildModule } from "@nomicfoundation/ignition-core";

import { createConnection } from "../test-helpers/create-hre.js";
import { externallyLoadedContractArtifact } from "../test-helpers/externally-loaded-contract.js";

describe("deploy converts ignition artifact contractAt to viem instance", () => {
  useEphemeralFixtureProject("minimal");

  let result: IgnitionModuleResultsToViemContracts<
    string,
    {
      externallyLoadedContractAt: ContractAtFuture<
        (typeof externallyLoadedContractArtifact)["abi"]
      >;
    }
  >;

  beforeEach(async function () {
    const moduleDefinition = buildModule("Module", (m) => {
      const externallyLoadedContract = m.contract(
        "ExternallyLoadedContract",
        externallyLoadedContractArtifact,
        [],
      );

      const externallyLoadedContractAt = m.contractAt(
        "externallyLoadedContractAt",
        externallyLoadedContractArtifact,
        externallyLoadedContract,
        { id: "externallyLoadedContractAt" },
      );

      return { externallyLoadedContractAt };
    });

    const connection = await createConnection();

    result = await connection.ignition.deploy(moduleDefinition);
  });

  it("should provide the address", async function () {
    assert.equal(
      result.externallyLoadedContractAt.address,
      "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    );
  });

  it("should provide the abi", async function () {
    assert.equal(
      result.externallyLoadedContractAt.abi,
      externallyLoadedContractArtifact.abi,
    );
  });

  it("should allow reading the contract instance", async function () {
    assert.equal(
      await result.externallyLoadedContractAt.read.buildMessage([
        "Hello World",
      ]),
      "A message: Hello World",
    );
  });

  it("should allow writing to the contract instance", async function () {
    await result.externallyLoadedContractAt.write.inc();
    await result.externallyLoadedContractAt.write.inc();
    await result.externallyLoadedContractAt.write.inc();

    assert.equal(await result.externallyLoadedContractAt.read.x(), 4n);
  });

  it("should support simulating write function calls", async function () {
    const { result: simulationResult } =
      await result.externallyLoadedContractAt.simulate.inc();

    assert.equal(simulationResult, 2n);
  });

  it("should support gas estimation of write function calls", async function () {
    const estimation =
      await result.externallyLoadedContractAt.estimateGas.inc();

    assert.notEqual(estimation, undefined);
    assert(typeof estimation === "bigint", "Estimation should be a bigint");
  });

  it("should enforce the type is constrained to the contracts functions", async function () {
    await assertRejects(
      // @ts-expect-error -- Expect an error
      result.externallyLoadedContractAt.write.nonexistantWrite(),
    );
    await assertRejects(
      // @ts-expect-error -- Expect an error
      result.externallyLoadedContractAt.read.nonexistantRead(),
    );
    await assertRejects(
      // @ts-expect-error -- Expect an error
      result.externallyLoadedContractAt.estimateGas.nonexistantEstimate(),
    );
    await assertRejects(
      // @ts-expect-error -- Expect an error
      result.externallyLoadedContractAt.simulate.nonexistantEstimate(),
    );
  });
});
