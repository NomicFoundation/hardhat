import { assert } from "chai";

import { defineModule } from "../../src/new-api/define-module";
import { Batcher } from "../../src/new-api/internal/batcher";
import { ModuleConstructor } from "../../src/new-api/internal/module-builder";
import {
  DeploymentExecutionState,
  ExecutionStateMap,
  ExecutionStatus,
} from "../../src/new-api/types/execution-state";
import {
  FutureType,
  IgnitionModuleResult,
} from "../../src/new-api/types/module";
import { IgnitionModuleDefinition } from "../../src/new-api/types/module-builder";

describe("batcher", () => {
  const exampleDeploymentState: DeploymentExecutionState = {
    id: "Example",
    futureType: FutureType.NAMED_CONTRACT_DEPLOYMENT,
    strategy: "basic",
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(),
    history: [],
    storedArtifactPath: "./artifact.json",
    storedBuildInfoPath: "./build-info.json",
    value: BigInt("0"),
    constructorArgs: [],
    libraries: {},
  };

  it("should batch a contract deploy module", () => {
    const moduleDefinition = defineModule("Module1", (m) => {
      const contract1 = m.contract("Contract1");

      return { contract1 };
    });

    assertBatching({ moduleDefinition }, [["Module1:Contract1"]]);
  });

  it("should batch through dependencies", () => {
    const moduleDefinition = defineModule("Module1", (m) => {
      const contract1 = m.contract("Contract1");
      const contract2 = m.contract("Contract2");

      const contract3 = m.contract("Contract3", [contract1, contract2]);

      const contract4 = m.contract("Contract4", [], {
        after: [contract3],
      });

      const contract5 = m.contract("Contract5", [], {
        after: [contract3],
      });

      return { contract1, contract2, contract3, contract4, contract5 };
    });

    assertBatching({ moduleDefinition }, [
      ["Module1:Contract1", "Module1:Contract2"],
      ["Module1:Contract3"],
      ["Module1:Contract4", "Module1:Contract5"],
    ]);
  });

  it("should batch submodules such that everything in a submodule is executed if just one future in the submodule is depended on", () => {
    const submoduleLeft = defineModule("SubmoduleLeft", (m) => {
      const contract1 = m.contract("Contract1");
      m.call(contract1, "configure");

      return { contract1 };
    });

    const submoduleRight = defineModule("SubmoduleRight", (m) => {
      const contract2 = m.contract("Contract2");
      m.call(contract2, "configure");

      return { contract2 };
    });

    const submoduleMiddle = defineModule("SubmoduleMiddle", (m) => {
      const { contract1 } = m.useModule(submoduleLeft);
      const { contract2 } = m.useModule(submoduleRight);

      const contract3 = m.contract("Contract3", [contract1, contract2]);
      m.call(contract3, "configure");

      return { contract3 };
    });

    const moduleDefinition = defineModule("Module", (m) => {
      const { contract3 } = m.useModule(submoduleMiddle);

      const contract4 = m.contract("Contract4", [contract3]);
      m.call(contract4, "configure");

      return { contract4 };
    });

    assertBatching({ moduleDefinition }, [
      ["SubmoduleLeft:Contract1", "SubmoduleRight:Contract2"],
      [
        "SubmoduleLeft:Contract1#configure",
        "SubmoduleRight:Contract2#configure",
      ],
      ["SubmoduleMiddle:Contract3"],
      ["SubmoduleMiddle:Contract3#configure"],
      ["Module:Contract4"],
      ["Module:Contract4#configure"],
    ]);
  });

  it("should deploy submodules even when no direct connection", () => {
    const submoduleLeft = defineModule("Left", (m) => {
      const contract1 = m.contract("Contract1");

      return { contract1 };
    });

    const submoduleRight = defineModule("Right", (m) => {
      const contract2 = m.contract("Contract2");

      return { contract2 };
    });

    const submoduleMiddle = defineModule("Middle", (m) => {
      m.useModule(submoduleLeft);
      m.useModule(submoduleRight);

      const contract3 = m.contract("Contract3", []);

      return { contract3 };
    });

    const moduleDefinition = defineModule("Module", (m) => {
      const { contract3 } = m.useModule(submoduleMiddle);

      const contract4 = m.contract("Contract4", [contract3]);

      return { contract4 };
    });

    assertBatching({ moduleDefinition }, [
      ["Left:Contract1", "Middle:Contract3", "Right:Contract2"],
      ["Module:Contract4"],
    ]);
  });

  it("should bypass intermediary successful nodes", () => {
    const moduleDefinition = defineModule("Module1", (m) => {
      const contract1 = m.contract("Contract1");
      const contract2 = m.contract("Contract2", [contract1]);

      const contract3 = m.contract("Contract3", [contract2]);

      return { contract1, contract2, contract3 };
    });

    assertBatching(
      {
        moduleDefinition,
        executionStates: {
          "Module1:Contract2": {
            ...exampleDeploymentState,
            id: "Module1:Contract2",
            status: ExecutionStatus.SUCCESS,
          },
        },
      },
      [["Module1:Contract1"], ["Module1:Contract3"]]
    );
  });
});

function assertBatching(
  {
    moduleDefinition,
    executionStates = {},
  }: {
    moduleDefinition: IgnitionModuleDefinition<
      string,
      string,
      IgnitionModuleResult<string>
    >;
    executionStates?: ExecutionStateMap;
  },
  expectedBatches: string[][]
) {
  const constructor = new ModuleConstructor([]);
  const module = constructor.construct(moduleDefinition);

  assert.isDefined(module);

  const actualBatches = Batcher.batch(module, executionStates);

  assert.deepStrictEqual(actualBatches, expectedBatches);
}
