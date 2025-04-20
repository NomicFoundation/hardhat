import { assert } from "chai";

import { buildModule } from "../src/build-module.js";
import { Batcher } from "../src/internal/batcher.js";
import { DeploymentState } from "../src/internal/execution/types/deployment-state.js";
import {
  DeploymentExecutionState,
  ExecutionSateType,
  ExecutionStatus,
} from "../src/internal/execution/types/execution-state.js";
import { FutureType, IgnitionModule } from "../src/types/module.js";

describe("batcher", () => {
  const exampleDeploymentState: DeploymentExecutionState = {
    id: "Example",
    type: ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
    futureType: FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT,
    strategy: "basic",
    strategyConfig: {},
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(),
    networkInteractions: [],
    artifactId: "./artifact.json",
    contractName: "Contract1",
    value: BigInt("0"),
    constructorArgs: [],
    libraries: {},
    from: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  };

  it("should batch a contract deploy module", () => {
    const ignitionModule = buildModule("Module1", (m) => {
      const contract1 = m.contract("Contract1");

      return { contract1 };
    });

    assertBatching({ ignitionModule }, [["Module1#Contract1"]]);
  });

  it("should batch through dependencies", () => {
    const otherModule = buildModule("Module2", (m) => {
      const example = m.contract("Example");
      return { example };
    });

    const ignitionModule = buildModule("Module1", (m) => {
      const contract1 = m.contract("Contract1");
      const contract2 = m.contract("Contract2", [], { after: [otherModule] });

      const contract3 = m.contract("Contract3", [contract1, contract2]);

      const contract4 = m.contract("Contract4", [], {
        after: [contract3],
      });

      const contract5 = m.contract("Contract5", [], {
        after: [contract3],
      });

      return { contract1, contract2, contract3, contract4, contract5 };
    });

    assertBatching({ ignitionModule }, [
      ["Module1#Contract1", "Module2#Example"],
      ["Module1#Contract2"],
      ["Module1#Contract3"],
      ["Module1#Contract4", "Module1#Contract5"],
    ]);
  });

  it("should batch submodules such that everything in a submodule is executed if just one future in the submodule is depended on", () => {
    const submoduleLeft = buildModule("SubmoduleLeft", (m) => {
      const contract1 = m.contract("Contract1");
      m.call(contract1, "configure");

      return { contract1 };
    });

    const submoduleRight = buildModule("SubmoduleRight", (m) => {
      const contract2 = m.contract("Contract2");
      m.call(contract2, "configure");

      return { contract2 };
    });

    const submoduleMiddle = buildModule("SubmoduleMiddle", (m) => {
      const { contract1 } = m.useModule(submoduleLeft);
      const { contract2 } = m.useModule(submoduleRight);

      const contract3 = m.contract("Contract3", [contract1, contract2]);
      m.call(contract3, "configure");

      return { contract3 };
    });

    const ignitionModule = buildModule("Module", (m) => {
      const { contract3 } = m.useModule(submoduleMiddle);

      const contract4 = m.contract("Contract4", [contract3]);
      m.call(contract4, "configure");

      return { contract4 };
    });

    assertBatching({ ignitionModule }, [
      ["SubmoduleLeft#Contract1", "SubmoduleRight#Contract2"],
      [
        "SubmoduleLeft#Contract1.configure",
        "SubmoduleRight#Contract2.configure",
      ],
      ["SubmoduleMiddle#Contract3"],
      ["SubmoduleMiddle#Contract3.configure"],
      ["Module#Contract4"],
      ["Module#Contract4.configure"],
    ]);
  });

  it("should deploy submodules even when no direct connection", () => {
    const submoduleLeft = buildModule("Left", (m) => {
      const contract1 = m.contract("Contract1");

      return { contract1 };
    });

    const submoduleRight = buildModule("Right", (m) => {
      const contract2 = m.contract("Contract2");

      return { contract2 };
    });

    const submoduleMiddle = buildModule("Middle", (m) => {
      m.useModule(submoduleLeft);
      m.useModule(submoduleRight);

      const contract3 = m.contract("Contract3", []);

      return { contract3 };
    });

    const ignitionModule = buildModule("Module", (m) => {
      const { contract3 } = m.useModule(submoduleMiddle);

      const contract4 = m.contract("Contract4", [contract3]);

      return { contract4 };
    });

    assertBatching({ ignitionModule }, [
      ["Left#Contract1", "Middle#Contract3", "Right#Contract2"],
      ["Module#Contract4"],
    ]);
  });

  it("should bypass intermediary successful nodes", () => {
    const ignitionModule = buildModule("Module1", (m) => {
      const contract1 = m.contract("Contract1");
      const contract2 = m.contract("Contract2", [contract1]);

      const contract3 = m.contract("Contract3", [contract2]);

      return { contract1, contract2, contract3 };
    });

    assertBatching(
      {
        ignitionModule,
        deploymentState: {
          chainId: 123,
          executionStates: {
            "Module1#Contract2": {
              ...exampleDeploymentState,
              id: "Module1#Contract2",
              status: ExecutionStatus.SUCCESS,
            },
          },
        },
      },
      [["Module1#Contract1"], ["Module1#Contract3"]],
    );
  });
});

function assertBatching(
  {
    ignitionModule,
    deploymentState = { chainId: 123, executionStates: {} },
  }: {
    ignitionModule: IgnitionModule;
    deploymentState?: DeploymentState;
  },
  expectedBatches: string[][],
) {
  assert.isDefined(ignitionModule);

  const actualBatches = Batcher.batch(ignitionModule, deploymentState);

  assert.deepStrictEqual(actualBatches, expectedBatches);
}
