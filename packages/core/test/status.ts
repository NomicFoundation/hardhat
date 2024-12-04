import { assert } from "chai";
import path from "path";

import { Artifact, status } from "../src";

import { setupMockArtifactResolver } from "./helpers";

describe("status", () => {
  it("should return a status result for a successful deployment", async () => {
    const expectedResult = {
      started: [],
      successful: ["LockModule#Lock"],
      held: [],
      timedOut: [],
      failed: [],
      chainId: 1,
      contracts: {
        "LockModule#Lock": {
          id: "LockModule#Lock",
          contractName: "ArtifactLock",
          address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
          sourceName: "contracts/ArtifactLock.sol",
          abi: ["test"],
        },
      },
    };

    const fakeArtifact: Artifact = {
      abi: ["test"],
      contractName: "ArtifactLock",
      sourceName: "contracts/ArtifactLock.sol",
      bytecode: "",
      linkReferences: {},
    };

    const deploymentDir = path.join(__dirname, "mocks", "status", "success");

    const artifactResolver = setupMockArtifactResolver({ Lock: fakeArtifact });

    const result = await status(deploymentDir, artifactResolver);

    assert.deepEqual(result, expectedResult);
  });

  it("should return a status result for a successful deployment with external artifacts", async () => {
    const expectedResult = {
      started: [],
      successful: ["LockModule#Basic", "LockModule#Basic2", "LockModule#Lock"],
      held: [],
      timedOut: [],
      failed: [],
      chainId: 31337,
      contracts: {
        "LockModule#Basic": {
          id: "LockModule#Basic",
          contractName: "Basic",
          address: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
          sourceName: "",
          abi: [],
        },
        "LockModule#Basic2": {
          id: "LockModule#Basic2",
          contractName: "Basic2",
          address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
          sourceName: "",
          abi: [],
        },
        "LockModule#Lock": {
          id: "LockModule#Lock",
          contractName: "ArtifactLock",
          address: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
          sourceName: "contracts/ArtifactLock.sol",
          abi: ["test"],
        },
      },
    };

    const fakeArtifact: Artifact = {
      abi: ["test"],
      contractName: "ArtifactLock",
      sourceName: "contracts/ArtifactLock.sol",
      bytecode: "",
      linkReferences: {},
    };

    const deploymentDir = path.join(
      __dirname,
      "mocks",
      "status",
      "external-artifact"
    );

    const artifactResolver = setupMockArtifactResolver({ Lock: fakeArtifact });

    const result = await status(deploymentDir, artifactResolver);

    assert.deepEqual(result, expectedResult);
  });

  it("should throw an error if the deployment is not initialized", async () => {
    const artifactResolver = setupMockArtifactResolver();

    await assert.isRejected(
      status("fake", artifactResolver),
      /IGN800: Cannot get status for nonexistant deployment at fake/
    );
  });
});
