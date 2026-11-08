import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { assert } from "chai";
import path from "path";

import { buildModule } from "../../src/build-module.js";
import {
  ExecutionSateType,
  ExecutionStatus,
} from "../../src/internal/execution/types/execution-state.js";
import { NetworkInteractionType } from "../../src/internal/execution/types/network-interaction.js";
import { ExecutionEngine } from "../../src/internal/execution/execution-engine.js";
import { FileDeploymentLoader } from "../../src/internal/deployment-loader/file-deployment-loader.js";
import { loadDeploymentState } from "../../src/internal/execution/deployment-state-helpers.js";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("ExecutionEngine", () => {
  for (const higherNonceSender of [
    "0xffffffffffffffffffffffffffffffffffffffff",
    "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",
  ]) {
    it(`orders pending nonces before new futures for sender ${higherNonceSender}`, () => {
      const module = buildModule("Order", (m) => {
        const a = m.contract("A");
        const b = m.contract("B");
        const c = m.contract("C");
        return { a, b, c };
      });
      const engine = new ExecutionEngine(
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        undefined,
        1,
        1,
        1,
        1,
        false,
        1,
        1,
      );
      const state = (
        id: string,
        nonce: number,
        from = "0xffffffffffffffffffffffffffffffffffffffff",
      ) => ({
        id,
        type: ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
        status: ExecutionStatus.STARTED,
        from,
        networkInteractions: [
          {
            type: NetworkInteractionType.ONCHAIN_INTERACTION,
            nonce,
            transactions: [],
          },
        ],
      });
      const futures = Object.values(module.results);
      const sorted = (engine as any)._getBatchSortedByHighestPendingNonce(
        futures,
        {
          executionStates: {
            "Order#B": state("Order#B", 1, higherNonceSender),
            "Order#C": state("Order#C", 0),
          },
        },
      );
      assert.deepEqual(
        sorted.map((f: any) => f.id),
        ["Order#C", "Order#B", "Order#A"],
      );
    });
  }

  describe("_checkForMissingTransactions", () => {
    it("should throw if there are PREPARE_SEND_TRANSACTION messages without a corresponding SEND_TRANSACTION message", async () => {
      const deploymentLoader = new FileDeploymentLoader(
        path.resolve(__dirname, "../mocks/trackTransaction/success"),
      );

      // the only thing the function we are testing requires is a deploymentLoader
      const engine = new ExecutionEngine(
        deploymentLoader,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        5,
        5,
        5,
        5,
        false,
        10,
        1000,
      );

      const deploymentState = await loadDeploymentState(deploymentLoader);

      assert(deploymentState !== undefined, "deploymentState is undefined");

      await assertRejectsWithHardhatError(
        engine.executeModule(deploymentState, {} as any, [], [], {}, "0x"),
        HardhatError.ERRORS.IGNITION.EXECUTION.TRANSACTION_LOST,
        {
          futureId: "LockModule#Lock",
          nonce: 1,
          sender: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
        },
      );
    });
  });
});
