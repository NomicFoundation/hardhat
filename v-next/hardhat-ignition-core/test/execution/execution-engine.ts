import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { assert } from "chai";
import path from "path";

import { ExecutionEngine } from "../../src/internal/execution/execution-engine.js";
import { FileDeploymentLoader } from "../../src/internal/deployment-loader/file-deployment-loader.js";
import { loadDeploymentState } from "../../src/internal/execution/deployment-state-helpers.js";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("ExecutionEngine", () => {
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
