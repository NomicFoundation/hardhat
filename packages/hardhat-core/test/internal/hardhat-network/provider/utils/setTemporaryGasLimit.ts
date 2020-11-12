import { assert } from "chai";
import FakeTransaction from "ethereumjs-tx/dist/fake";
import Transaction from "ethereumjs-tx/dist/transaction";
import { bufferToHex, bufferToInt, toBuffer } from "ethereumjs-util";

import { randomAddressBuffer } from "../../../../../src/internal/hardhat-network/provider/fork/random";
import { setTemporaryGasLimit } from "../../../../../src/internal/hardhat-network/provider/utils/setTemporaryGasLimit";
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_ACCOUNTS_ADDRESSES,
} from "../../helpers/providers";

describe("setTemporaryGasLimit", () => {
  const initialGasLimit = 40_000;
  const senderPrivateKey = toBuffer(DEFAULT_ACCOUNTS[0].privateKey);
  const senderAddress = DEFAULT_ACCOUNTS_ADDRESSES[0];

  let tx: Transaction | FakeTransaction;

  describe("for Transaction objects", () => {
    beforeEach(() => {
      tx = new Transaction({
        to: randomAddressBuffer(),
        value: 1,
        nonce: 1,
        gasLimit: initialGasLimit,
        gasPrice: 8e9,
      });
      tx.sign(senderPrivateKey);
    });

    worksAsExpected();
  });

  describe("for FakeTransaction objects", () => {
    beforeEach(() => {
      tx = new FakeTransaction({
        from: senderAddress,
        to: randomAddressBuffer(),
        value: 1,
        nonce: 1,
        gasLimit: initialGasLimit,
        gasPrice: 8e9,
      });
    });

    worksAsExpected();
  });

  function worksAsExpected() {
    it("sets the new gas limit", () => {
      setTemporaryGasLimit(tx, 21_000);
      assert.equal(bufferToInt(tx.gasLimit), 21_000);
    });

    it("returns a function to reset the gas limit to initial value", async () => {
      const resetGasLimit = setTemporaryGasLimit(tx, 21_000);
      resetGasLimit();
      assert.equal(bufferToInt(tx.gasLimit), initialGasLimit);
    });

    it("does not change the sender address", async () => {
      const resetGasLimit = setTemporaryGasLimit(tx, 21_000);
      assert.equal(bufferToHex(tx.getSenderAddress()), senderAddress);
      resetGasLimit();
      assert.equal(bufferToHex(tx.getSenderAddress()), senderAddress);
    });
  }
});
