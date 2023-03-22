/* eslint-disable import/no-unused-modules */
import type {
  IDeploymentGraph,
  IDeploymentBuilder,
} from "../../src/types/deploymentGraph";

import { assert } from "chai";

import { buildModule } from "../../src/dsl/buildModule";
import { generateDeploymentGraphFrom } from "../../src/process/generateDeploymentGraphFrom";
import { isArtifactContract } from "../../src/utils/guards";

import { getDeploymentVertexByLabel } from "./helpers";

describe("deployment builder - artifacts", () => {
  let deploymentGraph: IDeploymentGraph;

  before(() => {
    const artifactsModule = buildModule(
      "artifacts",
      (m: IDeploymentBuilder) => {
        const artifact = m.getArtifact("Token");

        const token = m.contract("Token", artifact);

        return { token };
      }
    );

    const { graph } = generateDeploymentGraphFrom(artifactsModule, {
      chainId: 31337,
      accounts: [
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      ],
      artifacts: [
        {
          contractName: "Token",
          bytecode: "test",
          abi: [],
          linkReferences: {},
        },
      ],
    });

    deploymentGraph = graph;
  });

  it("should retrieve the stored artifact", () => {
    const depNode = getDeploymentVertexByLabel(deploymentGraph, "Token");

    if (depNode === undefined) {
      return assert.fail("depNode not retrieved");
    }

    if (!isArtifactContract(depNode)) {
      return assert.fail("unknown error");
    }

    assert.equal(depNode.artifact.bytecode, "test");
  });
});
