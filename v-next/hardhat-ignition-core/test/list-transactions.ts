import { assert } from "chai";
import path from "path";

import {
  listTransactions,
  ListTransactionsResult,
  TransactionStatus,
} from "../src/index.js";

import { setupMockArtifactResolver } from "./helpers.js";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("listTransactions", () => {
  it("should return the transactions associated with a deployment", async () => {
    const expected: ListTransactionsResult = [
      {
        type: "DEPLOYMENT_EXECUTION_STATE",
        from: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
        txHash:
          "0x65c7c0850d014fe44aced2249b3b3523c3a29e5e40b6388b6d84b28c0345b9e1",
        status: TransactionStatus.SUCCESS,
        name: "BasicContract",
        address: "0x74e720c9B362ae3A65fF356ad62866511486BBBc",
        params: ["0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"],
        value: 0n,
        browserUrl: undefined,
      },
      {
        type: "DEPLOYMENT_EXECUTION_STATE",
        from: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
        txHash:
          "0xee331a69f69646d8b551a1ee6514760763cb7b1c332dadb2f0d05c730e554a28",
        status: TransactionStatus.SUCCESS,
        name: "BasicLibrary",
        address: "0x1c947344BA932fC7f3D622600dA0199520A67EFd",
        params: [],
        value: 0n,
        browserUrl: undefined,
      },
      {
        type: "DEPLOYMENT_EXECUTION_STATE",
        from: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
        txHash:
          "0x6f06b87969f7543887e7cda4b0cf82426b6712a57c915593adf2dd6168f9f283",
        status: TransactionStatus.SUCCESS,
        name: "BasicLibrary",
        address: "0xBdAce15b3211019E272418B8014971c1cefbC8f0",
        params: [],
        value: 0n,
        browserUrl: undefined,
      },
      {
        type: "CALL_EXECUTION_STATE",
        from: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
        txHash:
          "0xb7b49d16087ab6351e26b2358ae211e5dac335441f323a28c6c26f0bc0c3a0a3",
        status: TransactionStatus.SUCCESS,
        name: "BasicContract#basicFunction",
        to: "0x74e720c9B362ae3A65fF356ad62866511486BBBc",
        params: [40],
        value: 0n,
        browserUrl: undefined,
      },
      {
        type: "DEPLOYMENT_EXECUTION_STATE",
        from: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
        txHash:
          "0x7542503401d0ad31f0c8de576c8d524535538c25050bd20f77562ecab25c4c8d",
        status: TransactionStatus.SUCCESS,
        name: "ContractWithLibrary",
        address: "0xD369D9aB22D85C2A12bEabc0B581a419789E3755",
        params: [],
        value: 0n,
        browserUrl: undefined,
      },
      {
        type: "SEND_DATA_EXECUTION_STATE",
        from: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
        txHash:
          "0x2870c7d9f84122caba3739be0dc2246343a87d1b216b57002654b3bd413fe8e2",
        status: TransactionStatus.SUCCESS,
        to: "0x74e720c9B362ae3A65fF356ad62866511486BBBc",
        value: 123n,
        browserUrl: undefined,
      },
    ];

    const deploymentDir = path.join(
      __dirname,
      "mocks",
      "listTransactions",
      "success",
    );

    const artifactResolver = setupMockArtifactResolver();

    const result = await listTransactions(deploymentDir, artifactResolver);

    assert.deepEqual(result, expected);
  });

  it("should throw an error if the deployment is not initialized", async () => {
    const artifactResolver = setupMockArtifactResolver();

    await assert.isRejected(
      listTransactions("fake", artifactResolver),
      /IGN1200: Cannot list transactions for nonexistant deployment at fake/,
    );
  });
});
