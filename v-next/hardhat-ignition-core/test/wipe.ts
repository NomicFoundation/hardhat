import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { assert } from "chai";

import { ArtifactResolver } from "../src/index.js";
import { EphemeralDeploymentLoader } from "../src/internal/deployment-loader/ephemeral-deployment-loader.js";
import {
  applyNewMessage,
  initializeDeploymentState,
} from "../src/internal/execution/deployment-state-helpers.js";
import {
  DeploymentExecutionStateInitializeMessage,
  JournalMessageType,
} from "../src/internal/execution/types/messages.js";
import { Wiper } from "../src/internal/wiper.js";
import { FutureType } from "../src/types/module.js";

describe("wipe", () => {
  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

  const mockArtifactResolver: ArtifactResolver = {
    getBuildInfo(_: string) {
      throw new Error("Mock not implemented");
    },
    loadArtifact(_: string) {
      throw new Error("Mock not implemented");
    },
  };
  const contract1Id = "Module1:Contract1";
  const contract1InitMessage: DeploymentExecutionStateInitializeMessage = {
    type: JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE,
    futureId: contract1Id,
    futureType: FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT,
    artifactId: contract1Id,
    constructorArgs: [],
    contractName: "Contract1",
    dependencies: [],
    from: exampleAddress,
    libraries: {},
    strategy: "basic",
    strategyConfig: {},
    value: 0n,
  };

  const contract2Id = "Module1:Contract1";
  const contract2InitMessage: DeploymentExecutionStateInitializeMessage = {
    type: JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE,
    futureId: contract1Id,
    futureType: FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT,
    artifactId: contract2Id,
    constructorArgs: [],
    contractName: "Contract1",
    dependencies: [contract1Id],
    from: exampleAddress,
    libraries: {},
    strategy: "basic",
    strategyConfig: {},
    value: 0n,
  };

  it("should allow wiping of future", async () => {
    const deploymentLoader = new EphemeralDeploymentLoader(
      mockArtifactResolver,
    );

    let deploymentState = await initializeDeploymentState(
      123,
      deploymentLoader,
    );

    deploymentState = await applyNewMessage(
      contract1InitMessage,
      deploymentState,
      deploymentLoader,
    );

    assert.isDefined(deploymentState.executionStates[contract1Id]);

    const wiper = new Wiper(deploymentLoader);

    deploymentState = await wiper.wipe(contract1Id);

    assert.isUndefined(deploymentState.executionStates[contract1Id]);
  });

  it("should error if the deployment hasn't been initialized", async () => {
    const deploymentLoader = new EphemeralDeploymentLoader(
      mockArtifactResolver,
    );

    const wiper = new Wiper(deploymentLoader);
    await assertRejectsWithHardhatError(
      wiper.wipe("whatever"),
      HardhatError.ERRORS.IGNITION.WIPE.UNINITIALIZED_DEPLOYMENT,
      {
        futureId: "whatever",
      },
    );
  });

  it("should error if the future id doesn't exist", async () => {
    const deploymentLoader = new EphemeralDeploymentLoader(
      mockArtifactResolver,
    );

    await initializeDeploymentState(123, deploymentLoader);

    const wiper = new Wiper(deploymentLoader);
    await assertRejectsWithHardhatError(
      wiper.wipe("Module1:Nonexistant"),
      HardhatError.ERRORS.IGNITION.WIPE.NO_STATE_FOR_FUTURE,
      {
        futureId: "Module1:Nonexistant",
      },
    );
  });

  it("should error if other futures are depenent on the future being wiped", async () => {
    const deploymentLoader = new EphemeralDeploymentLoader(
      mockArtifactResolver,
    );

    let deploymentState = await initializeDeploymentState(
      123,
      deploymentLoader,
    );

    deploymentState = await applyNewMessage(
      contract1InitMessage,
      deploymentState,
      deploymentLoader,
    );

    deploymentState = await applyNewMessage(
      contract2InitMessage,
      deploymentState,
      deploymentLoader,
    );

    assert.isDefined(deploymentState.executionStates[contract1Id]);
    assert.isDefined(deploymentState.executionStates[contract2Id]);

    const wiper = new Wiper(deploymentLoader);

    await assertRejectsWithHardhatError(
      wiper.wipe(contract1Id),
      HardhatError.ERRORS.IGNITION.WIPE.DEPENDENT_FUTURES,
      {
        futureId: contract1Id,
        dependents: contract2Id,
      },
    );
  });
});
