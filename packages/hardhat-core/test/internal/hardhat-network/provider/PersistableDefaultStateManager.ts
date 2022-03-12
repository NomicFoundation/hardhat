import { assert } from "chai";
import { Account, BN, bufferToHex, keccak256, toBuffer } from "ethereumjs-util";

import { PersistableDefaultStateManager } from "../../../../src/internal/hardhat-network/provider/PersistableDefaultStateManager";
import {
  randomAddress,
  randomHashBuffer,
} from "../../../../src/internal/hardhat-network/provider/fork/random";

describe("PersistableDefaultStateManager", () => {
  let sm: PersistableDefaultStateManager;

  beforeEach(async () => {
    sm = new PersistableDefaultStateManager();
  });

  it("can be constructed", () => {
    assert.instanceOf(sm, PersistableDefaultStateManager);
  });

  describe("dumpState", () => {
    describe("when state is not empty", () => {
      const address = randomAddress();
      const code = toBuffer("0xb16b00b1e5");
      const codeHash = keccak256(code);

      const storageAddress = randomHashBuffer();
      const storageData = randomHashBuffer();

      beforeEach(async () => {
        await sm.putContractCode(address, code);
        await sm.putAccount(
          address,
          Account.fromAccountData({
            nonce: new BN(1),
            balance: new BN(2),
            codeHash,
          })
        );

        await sm.putContractStorage(address, storageAddress, storageData);
      });

      describe("loading to new instance", () => {
        let dumpedState: any;
        let newSm: PersistableDefaultStateManager;

        const existingAddress = randomAddress();
        const existingCode = toBuffer(randomHashBuffer());
        const existingCodeHash = keccak256(existingCode);

        // saved to the same storage address for a more powerful test
        const existingStorageData = randomHashBuffer();

        beforeEach("load state", async () => {
          dumpedState = await sm.dumpState();
          newSm = new PersistableDefaultStateManager();

          await newSm.putContractCode(existingAddress, existingCode);
          await newSm.putAccount(
            existingAddress,
            Account.fromAccountData({
              nonce: new BN(10),
              balance: new BN(20),
              codeHash: existingCodeHash,
            })
          );

          await newSm.putContractStorage(
            existingAddress,
            storageAddress,
            existingStorageData
          );

          await newSm.loadState(dumpedState);
        });

        it("preserves existing account", async () => {
          const account = await newSm.getAccount(existingAddress);

          assert.equal(account.nonce.toNumber(), 10);
          assert.equal(
            bufferToHex(account.codeHash),
            bufferToHex(existingCodeHash)
          );
          assert.equal(account.balance.toNumber(), 20);
        });

        it("preserves existing contract info", async () => {
          const restoredCode = await newSm.getContractCode(existingAddress);

          assert.equal(bufferToHex(restoredCode), bufferToHex(existingCode));

          const restoredStorage = await newSm.getContractStorage(
            existingAddress,
            storageAddress
          );

          assert.equal(
            bufferToHex(restoredStorage),
            bufferToHex(existingStorageData)
          );
        });

        it("restores new account fields", async () => {
          const account = await newSm.getAccount(address);

          assert.equal(account.nonce.toNumber(), 1);
          assert.equal(bufferToHex(account.codeHash), bufferToHex(codeHash));
          assert.equal(account.balance.toNumber(), 2);
        });

        it("restores new contract info", async () => {
          const restoredCode = await newSm.getContractCode(address);

          assert.equal(bufferToHex(restoredCode), bufferToHex(code));

          const restoredStorage = await newSm.getContractStorage(
            address,
            storageAddress
          );

          assert.equal(bufferToHex(restoredStorage), bufferToHex(storageData));
        });
      });
    });
  });
});
