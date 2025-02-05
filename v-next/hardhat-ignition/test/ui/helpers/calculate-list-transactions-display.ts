import { TransactionStatus } from "@ignored/hardhat-vnext-ignition-core";
import { assert } from "chai";

import { calculateListTransactionsDisplay } from "../../../src/ui/helpers/calculate-list-transactions-display.js";

describe("calculateListTransactionsDisplay", function () {
  it("should serialize a bigint in transaction params", async () => {
    const result = await calculateListTransactionsDisplay("1", [
      {
        status: TransactionStatus.SUCCESS,
        type: "DEPLOYMENT_EXECUTION_STATE",
        txHash:
          "0x65c7c0850d014fe44aced2249b3b3523c3a29e5e40b6388b6d84b28c0345b9e1",
        from: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
        name: "BasicContract",
        address: "0x74e720c9B362ae3A65fF356ad62866511486BBBc",
        params: [BigInt(42)],
        value: BigInt(10),
      },
    ]);

    const expected = `Logging transactions for deployment 1

Transaction 1:
  - Type: Contract Deployment
  - Status: SUCCESS
  - TxHash: 0x65c7c0850d014fe44aced2249b3b3523c3a29e5e40b6388b6d84b28c0345b9e1
  - From: 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
  - Name: BasicContract
  - Address: 0x74e720c9B362ae3A65fF356ad62866511486BBBc
  - Params: ['42n']
  - Value: '10n'

`;

    assert.equal(result, expected);
  });

  it("should serialize bigints in nested transaction params", async () => {
    const result = await calculateListTransactionsDisplay("1", [
      {
        status: TransactionStatus.SUCCESS,
        type: "DEPLOYMENT_EXECUTION_STATE",
        txHash:
          "0x65c7c0850d014fe44aced2249b3b3523c3a29e5e40b6388b6d84b28c0345b9e1",
        from: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
        name: "BasicContract",
        address: "0x74e720c9B362ae3A65fF356ad62866511486BBBc",
        params: [
          1,
          2,
          "A",
          "B",
          [BigInt(42), BigInt(43)],
          { sub: { a: BigInt(44) } },
        ],
        value: BigInt(10),
      },
    ]);

    const expected = `Logging transactions for deployment 1

Transaction 1:
  - Type: Contract Deployment
  - Status: SUCCESS
  - TxHash: 0x65c7c0850d014fe44aced2249b3b3523c3a29e5e40b6388b6d84b28c0345b9e1
  - From: 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
  - Name: BasicContract
  - Address: 0x74e720c9B362ae3A65fF356ad62866511486BBBc
  - Params: [1,2,'A','B',['42n','43n'],{sub:{a:'44n'}}]
  - Value: '10n'

`;

    assert.equal(result, expected);
  });
});
