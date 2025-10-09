import { assert } from "chai";

import type { NamedArtifactContractAtFuture } from "../../../src/index.js";
import { deploymentStateReducer } from "../../../src/internal/execution/reducers/deployment-state-reducer.js";
import { NamedContractAtFutureImplementation } from "../../../src/internal/module.js";

import { setupFutureProcessor } from "./utils.js";

const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

describe("future processor", () => {
  const initialDeploymentState = deploymentStateReducer(undefined);

  describe("deploying a named contractAt", () => {
    it("should record the address of a contractAt future", async () => {
      // Arrange
      const fakeModule = {} as any;

      const deploymentFuture: NamedArtifactContractAtFuture<string> =
        new NamedContractAtFutureImplementation(
          "MyModule:TestContract",
          fakeModule,
          "TestContract",
          exampleAddress,
        );

      const { processor, storedDeployedAddresses } = await setupFutureProcessor(
        (() => {}) as any,
        {},
      );

      // Act
      await processor.processFuture(deploymentFuture, initialDeploymentState);

      // Assert
      assert.equal(
        storedDeployedAddresses["MyModule:TestContract"],
        exampleAddress,
      );
    });
  });
});
