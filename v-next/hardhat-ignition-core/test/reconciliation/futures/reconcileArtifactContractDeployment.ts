import { assert } from "chai";

import { buildModule } from "../../../src/build-module";
import { ExecutionResultType } from "../../../src/internal/execution/types/execution-result";
import {
  DeploymentExecutionState,
  ExecutionSateType,
  ExecutionStatus,
} from "../../../src/internal/execution/types/execution-state";
import { FutureType } from "../../../src/types/module";
import { exampleAccounts } from "../../helpers";
import {
  assertSuccessReconciliation,
  createDeploymentState,
  mockArtifact,
  oneAddress,
  reconcile,
  twoAddress,
} from "../helpers";

describe("Reconciliation - artifact contract", () => {
  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

  const exampleDeploymentState: DeploymentExecutionState = {
    id: "Example",
    futureType: FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT,
    type: ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
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
    from: exampleAccounts[0],
  };

  it("should reconcile unchanged", async () => {
    const submoduleDefinition = buildModule("Submodule", (m) => {
      const supply = m.getParameter("supply", BigInt(1000));
      const safeMath = m.library("SafeMath");

      const contract1 = m.contract("Contract1", mockArtifact, [{ supply }], {
        libraries: {
          SafeMath: safeMath,
        },
      });

      return { contract1 };
    });

    const moduleDefinition = buildModule("Module", (m) => {
      const { contract1 } = m.useModule(submoduleDefinition);

      return { contract1 };
    });

    await assertSuccessReconciliation(
      moduleDefinition,
      createDeploymentState(
        {
          ...exampleDeploymentState,
          id: "Submodule#SafeMath",
          futureType: FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT,
          status: ExecutionStatus.SUCCESS,
          contractName: "SafeMath",
          result: {
            type: ExecutionResultType.SUCCESS,
            address: exampleAddress,
          },
        },
        {
          ...exampleDeploymentState,
          id: "Submodule#Contract1",
          futureType: FutureType.CONTRACT_DEPLOYMENT,
          status: ExecutionStatus.STARTED,
          constructorArgs: [{ supply: BigInt(1000) }],
          libraries: {
            SafeMath: exampleAddress,
          },
        },
      ),
    );
  });

  it("should find changes to contract name unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const contract1 = m.contract("ContractChanged", mockArtifact, [], {
        id: "Example",
      });

      return { contract1 };
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState({
        ...exampleDeploymentState,
        id: "Module#Example",
        futureType: FutureType.CONTRACT_DEPLOYMENT,
        status: ExecutionStatus.STARTED,
        contractName: "ContractUnchanged",
      }),
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#Example",
        failure:
          "Contract name has been changed from ContractUnchanged to ContractChanged",
      },
    ]);
  });

  it("should find changes to constructors unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const owner = m.getAccount(3);
      const supply = m.getParameter("supply", BigInt(500));
      const ticker = m.getParameter("ticker", "CodeCoin");

      const contract1 = m.contract("Contract1", mockArtifact, [
        owner,
        { nested: { supply } },
        [1, ticker, 3],
      ]);

      return { contract1 };
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState({
        ...exampleDeploymentState,
        id: "Module#Contract1",
        futureType: FutureType.CONTRACT_DEPLOYMENT,
        status: ExecutionStatus.STARTED,
        constructorArgs: [
          "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
          { nested: { supply: BigInt(500) } },
          [1, "NotCodeCoin", 3],
        ],
      }),
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#Contract1",
        failure: "Argument at index 2 has been changed",
      },
    ]);
  });

  it("should reconcile an address arg with entirely different casing", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const contract1 = m.contract("Contract1", mockArtifact, [
        "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65",
      ]);

      return { contract1 };
    });

    await assertSuccessReconciliation(
      moduleDefinition,
      createDeploymentState({
        ...exampleDeploymentState,
        id: "Module#Contract1",
        futureType: FutureType.CONTRACT_DEPLOYMENT,
        status: ExecutionStatus.STARTED,
        constructorArgs: ["0x15D34AAF54267DB7D7C367839AAF71A00A2C6A65"],
      }),
    );
  });

  it("should fail to reconcile an address arg with partially different casing", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const contract1 = m.contract("Contract1", mockArtifact, [
        "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65",
      ]);

      return { contract1 };
    });

    const reconciliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState({
        ...exampleDeploymentState,
        id: "Module#Contract1",
        futureType: FutureType.CONTRACT_DEPLOYMENT,
        status: ExecutionStatus.STARTED,
        constructorArgs: ["0x15d34aaf54267db7D7c367839aaf71a00a2c6a65"],
      }),
    );

    assert.deepStrictEqual(reconciliationResult.reconciliationFailures, [
      {
        futureId: "Module#Contract1",
        failure: "Argument at index 0 has been changed",
      },
    ]);
  });

  it("should find changes to libraries unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const safeMath = m.library("SafeMath");

      const contract1 = m.contract("Contract1", mockArtifact, [], {
        libraries: {
          SafeMath: safeMath,
        },
      });

      return { contract1 };
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState(
        {
          ...exampleDeploymentState,
          id: "Module#SafeMath",
          futureType: FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT,
          status: ExecutionStatus.SUCCESS,
          contractName: "SafeMath",
          result: {
            type: ExecutionResultType.SUCCESS,
            address: exampleAddress,
          },
        },
        {
          ...exampleDeploymentState,
          id: "Module#Contract1",
          futureType: FutureType.CONTRACT_DEPLOYMENT,
          status: ExecutionStatus.STARTED,
          libraries: {},
        },
      ),
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#Contract1",
        failure: "Library SafeMath has been added",
      },
    ]);
  });

  it("should find changes to value unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const contract1 = m.contract("Contract1", mockArtifact, [], {
        id: "Example",
        value: BigInt(4),
      });

      return { contract1 };
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState({
        ...exampleDeploymentState,
        id: "Module#Example",
        futureType: FutureType.CONTRACT_DEPLOYMENT,
        status: ExecutionStatus.STARTED,
        value: BigInt(3),
      }),
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#Example",
        failure: "Value has been changed from 3 to 4",
      },
    ]);
  });

  it("should find changes to from unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const contract1 = m.contract("Contract1", mockArtifact, [], {
        id: "Example",
        from: twoAddress,
      });

      return { contract1 };
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState({
        ...exampleDeploymentState,
        id: "Module#Example",
        futureType: FutureType.CONTRACT_DEPLOYMENT,
        status: ExecutionStatus.STARTED,
        from: oneAddress,
      }),
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#Example",
        failure: `From account has been changed from ${oneAddress} to ${twoAddress}`,
      },
    ]);
  });

  it("should find changes to strategy name unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const contract1 = m.contract("Contract1", mockArtifact, [], {
        id: "Example",
      });

      return { contract1 };
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState({
        ...exampleDeploymentState,
        id: "Module#Example",
        futureType: FutureType.CONTRACT_DEPLOYMENT,
        status: ExecutionStatus.STARTED,
        strategy: "create2",
      }),
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#Example",
        failure: 'Strategy changed from "create2" to "basic"',
      },
    ]);
  });

  it("should find changes to strategy config unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const contract1 = m.contract("Contract1", mockArtifact, [], {
        id: "Example",
      });

      return { contract1 };
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState({
        ...exampleDeploymentState,
        id: "Module#Example",
        futureType: FutureType.CONTRACT_DEPLOYMENT,
        status: ExecutionStatus.STARTED,
        strategyConfig: { salt: "value" },
      }),
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module#Example",
        failure: 'Strategy config changed from {"salt":"value"} to {}',
      },
    ]);
  });
});
