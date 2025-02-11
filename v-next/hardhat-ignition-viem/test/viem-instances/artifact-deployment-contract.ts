import {
  ContractDeploymentFuture,
  buildModule,
} from "@ignored/hardhat-vnext-ignition-core";
import { assert } from "chai";

import { IgnitionModuleResultsToViemContracts } from "../../src/ignition-module-results-to-viem-contracts.js";
import { externallyLoadedContractArtifact } from "../test-helpers/externally-loaded-contract.js";
import { useIgnitionProject } from "../test-helpers/use-ignition-project.js";

describe("deploy converts ignition artifact contract to viem instance", () => {
  useIgnitionProject("minimal");

  let result: IgnitionModuleResultsToViemContracts<
    string,
    {
      externallyLoadedContract: ContractDeploymentFuture<
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
        { id: "ExternallyLoadedContract" }
      );

      return { externallyLoadedContract };
    });

    result = await this.connection.ignition.deploy(moduleDefinition);
  });

  it("should provide the address", async function () {
    assert.equal(
      result.externallyLoadedContract.address,
      "0x5FbDB2315678afecb367f032d93F642f64180aa3"
    );
  });

  it("should provide the abi", async function () {
    assert.equal(
      result.externallyLoadedContract.abi,
      externallyLoadedContractArtifact.abi
    );
  });

  it("should allow reading the contract instance", async function () {
    assert.equal(
      await result.externallyLoadedContract.read.buildMessage(["Hello World"]),
      "A message: Hello World"
    );
  });

  it("should allow writing to the contract instance", async function () {
    await result.externallyLoadedContract.write.inc();
    await result.externallyLoadedContract.write.inc();
    await result.externallyLoadedContract.write.inc();

    assert.equal(await result.externallyLoadedContract.read.x(), 4n);
  });

  it("should support simulating write function calls", async function () {
    const { result: simulationResult } =
      await result.externallyLoadedContract.simulate.inc();

    assert.equal(simulationResult, 2n);
  });

  it("should support gas estimation of write function calls", async function () {
    const estimation = await result.externallyLoadedContract.estimateGas.inc();

    assert.isDefined(estimation);
    assert(typeof estimation === "bigint");
  });

  it("should enforce the type is constrained to the contracts functions", async function () {
    await assert.isRejected(
      // @ts-expect-error
      result.externallyLoadedContract.write.nonexistantWrite(),
      /Make sure you are using the correct ABI and that the function exists on it./
    );
    await assert.isRejected(
      // @ts-expect-error
      result.externallyLoadedContract.read.nonexistantRead(),
      /Make sure you are using the correct ABI and that the function exists on it./
    );
    await assert.isRejected(
      // @ts-expect-error
      result.externallyLoadedContract.estimateGas.nonexistantEstimate(),
      /Make sure you are using the correct ABI and that the function exists on it./
    );
    await assert.isRejected(
      // @ts-expect-error
      result.externallyLoadedContract.simulate.nonexistantEstimate(),
      /Make sure you are using the correct ABI and that the function exists on it./
    );
  });
});
