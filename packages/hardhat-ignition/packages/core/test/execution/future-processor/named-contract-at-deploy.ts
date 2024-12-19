import { assert } from "chai";

import { NamedArtifactContractAtFuture } from "../../../src";
import { deploymentStateReducer } from "../../../src/internal/execution/reducers/deployment-state-reducer";
import { NamedContractAtFutureImplementation } from "../../../src/internal/module";

import { setupFutureProcessor } from "./utils";

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
          exampleAddress
        );

      const { processor, storedDeployedAddresses } = await setupFutureProcessor(
        (() => {}) as any,
        {}
      );

      // Act
      await processor.processFuture(deploymentFuture, initialDeploymentState);

      // Assert
      assert.equal(
        storedDeployedAddresses["MyModule:TestContract"],
        exampleAddress
      );
    });
  });
});
