import type { Artifact } from "../../src/types/artifacts.js";
import type { HardhatPlugin } from "../../src/types/plugins.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { task } from "../../src/config.js";
import { createMockHardhatRuntimeEnvironment } from "../test-helpers/create-mock-hardhat-runtime-environment.js";

// TODO: This test is an example and should be removed with the completion of
// the build system and the artifacts plugin.
describe("createMockHardhatRuntimeEnvironment", () => {
  it("should allow plugins that leverage the artifact hre object", async () => {
    // arrange
    const exampleArtifact: Artifact = {
      _format: "hh3-artifact-1",
      contractName: "MyContract",
      sourceName: "source.sol",
      abi: [],
      bytecode: "0x",
      linkReferences: {},
      deployedBytecode: "0x",
      deployedLinkReferences: {},
      immutableReferences: {},
    };

    const myPlugin: HardhatPlugin = {
      id: "my-plugin",
      tasks: [
        task("hello-artifact-using-world", "Tests artifact loading")
          .setAction(async () => ({
            default: (_args, hre) => {
              return hre.artifacts.readArtifact("MyContract");
            },
          }))
          .build(),
      ],
    };

    const mockHre = await createMockHardhatRuntimeEnvironment({
      plugins: [myPlugin],
    });

    await mockHre.artifacts.saveArtifact(exampleArtifact);

    // act
    const helloArtifactUsingWorld = mockHre.tasks.getTask(
      "hello-artifact-using-world",
    );

    const result = await helloArtifactUsingWorld.run({});

    // Assert
    assert.equal(result, exampleArtifact);
  });
});
