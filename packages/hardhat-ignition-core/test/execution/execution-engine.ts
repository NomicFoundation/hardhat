import { assert } from "chai";
import path from "path";

import { ExecutionEngine } from "../../src/internal/execution/execution-engine";
import { FileDeploymentLoader } from "../../src/internal/deployment-loader/file-deployment-loader";

describe("ExecutionEngine", () => {
  describe("_checkForMissingTransactions", () => {
    it("should throw if there are PREPARE_SEND_TRANSACTION messages without a corresponding SEND_TRANSACTION message", async () => {
      const deploymentLoader = new FileDeploymentLoader(
        path.resolve(__dirname, "../mocks/trackTransaction/success")
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
        false
      );

      await assert.isRejected(
        engine.executeModule({} as any, {} as any, [], [], {}, "0x"),
        `An error occured while trying to send a transaction for future LockModule#Lock.

Please use a block explorer to find the hash of the transaction with nonce 1 sent from account 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 and use the following command to add it to your deployment:

npx hardhat ignition track-tx <txHash> <deploymentId> --network <networkName>`
      );
    });
  });
});
