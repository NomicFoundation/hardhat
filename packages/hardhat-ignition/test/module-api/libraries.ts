import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildModule } from "@nomicfoundation/ignition-core";

import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project.js";

describe("libraries", () => {
  const project = useEphemeralIgnitionProject("minimal");

  it("should be able to deploy a contract that depends on a hardhat library", async function () {
    const moduleDefinition = buildModule("WithLibModule", (m) => {
      const rubbishMath = m.library("RubbishMath");
      const dependsOnLib = m.contract("DependsOnLib", [], {
        libraries: {
          RubbishMath: rubbishMath,
        },
      });

      return { rubbishMath, dependsOnLib };
    });

    const result = await project.ignition.deploy(moduleDefinition);

    assert.notEqual(result, undefined);
    const contractThatDependsOnLib = result.dependsOnLib;

    const libBasedAddition =
      await contractThatDependsOnLib.read.addThreeNumbers([1, 2, 3]);

    assert.equal(libBasedAddition, 6);
  });

  it("should be able to deploy a contract that depends on an artifact library", async function () {
    await project.hre.tasks.getTask("build").run({ quiet: true });

    const libraryArtifact =
      await project.hre.artifacts.readArtifact("RubbishMath");

    const moduleDefinition = buildModule("ArtifactLibraryModule", (m) => {
      const rubbishMath = m.library("RubbishMath", libraryArtifact);
      const dependsOnLib = m.contract("DependsOnLib", [], {
        libraries: {
          RubbishMath: rubbishMath,
        },
      });

      return { rubbishMath, dependsOnLib };
    });

    const result = await project.ignition.deploy(moduleDefinition);

    assert.notEqual(result, undefined);
    const contractThatDependsOnLib = result.dependsOnLib;

    const libBasedAddition =
      await contractThatDependsOnLib.read.addThreeNumbers([1, 2, 3]);

    assert.equal(libBasedAddition, 6);
  });

  it("should deploy a contract with an existing library", async function () {
    const libraryModuleDefinition = buildModule("LibraryModule", (m) => {
      const rubbishMath = m.library("RubbishMath");

      return { rubbishMath };
    });

    const libDeployResult = await project.ignition.deploy(
      libraryModuleDefinition,
    );

    const libAddress = libDeployResult.rubbishMath.address;

    const moduleDefinition = buildModule("ConsumingLibModule", (m) => {
      const rubbishMath = m.contractAt("RubbishMath", libAddress);

      const dependsOnLib = m.contract("DependsOnLib", [], {
        libraries: {
          RubbishMath: rubbishMath,
        },
      });

      return { dependsOnLib };
    });

    const result = await project.ignition.deploy(moduleDefinition);

    assert.equal(await libDeployResult.rubbishMath.read.add([1, 2]), 3);
    assert.equal(await result.dependsOnLib.read.addThreeNumbers([1, 2, 3]), 6);
  });

  it("should be able to deploy a library that depends on a library", async function () {
    const moduleDefinition = buildModule("ArtifactLibraryModule", (m) => {
      const rubbishMath = m.library("RubbishMath");

      const libDependsOnLib = m.library("LibDependsOnLib", {
        libraries: {
          RubbishMath: rubbishMath,
        },
      });

      const dependsOnLibThatDependsOnLib = m.contract(
        "DependsOnLibThatDependsOnLib",
        [],
        {
          libraries: {
            LibDependsOnLib: libDependsOnLib,
          },
        },
      );

      return { rubbishMath, libDependsOnLib, dependsOnLibThatDependsOnLib };
    });

    const result = await project.ignition.deploy(moduleDefinition);

    assert.notEqual(result, undefined);
    const contractThatDependsOnLibOnLib = result.dependsOnLibThatDependsOnLib;

    const libBasedAddition =
      await contractThatDependsOnLibOnLib.read.addThreeNumbers([1, 2, 3]);

    assert.equal(libBasedAddition, 6);
  });
});
