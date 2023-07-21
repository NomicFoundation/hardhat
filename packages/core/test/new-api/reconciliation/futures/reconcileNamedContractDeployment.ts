import { assert } from "chai";

import { defineModule } from "../../../../src/new-api/define-module";
import {
  DeploymentExecutionState,
  ExecutionStatus,
} from "../../../../src/new-api/internal/types/execution-state";
import { FutureType } from "../../../../src/new-api/types/module";
import { exampleAccounts, initOnchainState } from "../../helpers";
import {
  assertSuccessReconciliation,
  oneAddress,
  reconcile,
  twoAddress,
} from "../helpers";

describe("Reconciliation - named contract", () => {
  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

  const exampleDeploymentState: DeploymentExecutionState = {
    id: "Example",
    futureType: FutureType.NAMED_CONTRACT_DEPLOYMENT,
    strategy: "basic",
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(),
    history: [],
    onchain: initOnchainState,
    artifactFutureId: "./artifact.json",
    contractName: "Contract1",
    value: BigInt("0"),
    constructorArgs: [],
    libraries: {},
    from: exampleAccounts[0],
  };

  it("should reconcile unchanged", () => {
    const submoduleDefinition = defineModule("Submodule", (m) => {
      const owner = m.getAccount(3);
      const supply = m.getParameter("supply", BigInt(500));
      const ticker = m.getParameter("ticker", "CodeCoin");

      const safeMath = m.library("SafeMath");

      const contract1 = m.contract(
        "Contract1",
        [owner, { nested: { supply } }, [1, ticker, 3], safeMath],
        {
          libraries: {
            SafeMath: safeMath,
          },
        }
      );

      return { contract1 };
    });

    const moduleDefinition = defineModule("Module", (m) => {
      const { contract1 } = m.useModule(submoduleDefinition);

      return { contract1 };
    });

    assertSuccessReconciliation(moduleDefinition, {
      "Submodule:SafeMath": {
        ...exampleDeploymentState,
        futureType: FutureType.NAMED_LIBRARY_DEPLOYMENT,
        status: ExecutionStatus.SUCCESS,
        contractName: "SafeMath",
        contractAddress: exampleAddress,
      },
      "Submodule:Contract1": {
        ...exampleDeploymentState,
        status: ExecutionStatus.STARTED,
        constructorArgs: [
          "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
          { nested: { supply: BigInt(500) } },
          [1, "CodeCoin", 3],
          exampleAddress,
        ],
        libraries: {
          SafeMath: exampleAddress,
        },
      },
    });
  });

  it("should find changes to contract name unreconciliable", () => {
    const moduleDefinition = defineModule("Module", (m) => {
      const contract1 = m.contract("ContractChanged", [], {
        id: "Example",
      });

      return { contract1 };
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:Example": {
        ...exampleDeploymentState,
        status: ExecutionStatus.STARTED,
        contractName: "ContractUnchanged",
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:Example",
        failure:
          "Contract name has been changed from ContractUnchanged to ContractChanged",
      },
    ]);
  });

  it("should find changes to constructor args unreconciliable", () => {
    const moduleDefinition = defineModule("Module", (m) => {
      const owner = m.getAccount(3);
      const supply = m.getParameter("supply", BigInt(500));
      const ticker = m.getParameter("ticker", "CodeCoin");

      const contract1 = m.contract(
        "ContractChanged",
        [owner, { nested: { supply } }, [1, ticker, 3]],
        {
          id: "Example",
        }
      );

      return { contract1 };
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:Example": {
        ...exampleDeploymentState,
        status: ExecutionStatus.STARTED,
        contractName: "ContractUnchanged",
        constructorArgs: [1, 2, 3],
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:Example",
        failure:
          "Contract name has been changed from ContractUnchanged to ContractChanged",
      },
    ]);
  });

  it("should find changes to libraries unreconciliable", () => {
    const moduleDefinition = defineModule("Module", (m) => {
      const safeMath = m.library("SafeMath");

      const contract1 = m.contract("Contract1", [], {
        libraries: {
          SafeMath: safeMath,
        },
      });

      return { contract1 };
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:SafeMath": {
        ...exampleDeploymentState,
        futureType: FutureType.NAMED_LIBRARY_DEPLOYMENT,
        status: ExecutionStatus.SUCCESS,
        contractName: "SafeMath",
        contractAddress: exampleAddress,
      },
      "Module:Contract1": {
        ...exampleDeploymentState,
        status: ExecutionStatus.HOLD,
        libraries: {},
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:Contract1",
        failure: "Libraries have been changed",
      },
    ]);
  });

  it("should find changes to value unreconciliable", () => {
    const moduleDefinition = defineModule("Module", (m) => {
      const contract1 = m.contract("Contract", [], {
        id: "Example",
        value: BigInt(3),
      });

      return { contract1 };
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:Example": {
        ...exampleDeploymentState,
        status: ExecutionStatus.STARTED,
        contractName: "Contract",
        value: BigInt(2),
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:Example",
        failure: "Value has been changed from 2 to 3",
      },
    ]);
  });

  it("should find changes to from unreconciliable", () => {
    const moduleDefinition = defineModule("Module", (m) => {
      const contract1 = m.contract("Contract", [], {
        id: "Example",
        from: twoAddress,
      });

      return { contract1 };
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:Example": {
        ...exampleDeploymentState,
        status: ExecutionStatus.STARTED,
        contractName: "Contract",
        from: oneAddress,
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:Example",
        failure: `From account has been changed from ${oneAddress} to ${twoAddress}`,
      },
    ]);
  });
});
