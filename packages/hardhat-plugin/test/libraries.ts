/* eslint-disable import/no-unused-modules */
import { buildModule } from "@ignored/ignition-core";
import { assert } from "chai";

import { useEphemeralIgnitionProject } from "./use-ignition-project";

describe("libraries", () => {
  useEphemeralIgnitionProject("minimal-new-api");

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

    const result = await this.deploy(moduleDefinition);

    assert.isDefined(result);
    const contractThatDependsOnLib = result.dependsOnLib;

    const libBasedAddtion = await contractThatDependsOnLib.addThreeNumbers(
      1,
      2,
      3
    );

    assert.equal(libBasedAddtion, 6);
  });

  it("should be able to deploy a contract that depends on an artifact library", async function () {
    await this.hre.run("compile", { quiet: true });

    const libraryArtifact = await this.hre.artifacts.readArtifact(
      "RubbishMath"
    );

    const moduleDefinition = buildModule("ArtifactLibraryModule", (m) => {
      const rubbishMath = m.libraryFromArtifact("RubbishMath", libraryArtifact);
      const dependsOnLib = m.contract("DependsOnLib", [], {
        libraries: {
          RubbishMath: rubbishMath,
        },
      });

      return { rubbishMath, dependsOnLib };
    });

    const result = await this.deploy(moduleDefinition);

    assert.isDefined(result);
    const contractThatDependsOnLib = result.dependsOnLib;

    const libBasedAddtion = await contractThatDependsOnLib.addThreeNumbers(
      1,
      2,
      3
    );

    assert.equal(libBasedAddtion, 6);
  });

  it("should deploy a contract with an existing library", async function () {
    const libraryModuleDefinition = buildModule("LibraryModule", (m) => {
      const rubbishMath = m.library("RubbishMath");

      return { rubbishMath };
    });

    const libDeployResult = await this.deploy(libraryModuleDefinition);

    const libAddress = await libDeployResult.rubbishMath.getAddress();

    const moduleDefinition = buildModule("ConsumingLibModule", (m) => {
      const rubbishMath = m.contractAt("RubbishMath", libAddress);

      const dependsOnLib = m.contract("DependsOnLib", [], {
        libraries: {
          RubbishMath: rubbishMath,
        },
      });

      return { dependsOnLib };
    });

    const result = await this.deploy(moduleDefinition);

    assert.equal(await libDeployResult.rubbishMath.add(1, 2), 3);
    assert.equal(await result.dependsOnLib.addThreeNumbers(1, 2, 3), 6);
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
        }
      );

      return { rubbishMath, libDependsOnLib, dependsOnLibThatDependsOnLib };
    });

    const result = await this.deploy(moduleDefinition);

    assert.isDefined(result);
    const contractThatDependsOnLibOnLib = result.dependsOnLibThatDependsOnLib;

    const libBasedAddtion = await contractThatDependsOnLibOnLib.addThreeNumbers(
      1,
      2,
      3
    );

    assert.equal(libBasedAddtion, 6);
  });
});
