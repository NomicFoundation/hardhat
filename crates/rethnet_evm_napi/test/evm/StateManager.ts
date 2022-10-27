import { expect } from "chai";
import { Address } from "@nomicfoundation/ethereumjs-util";

import { Account, Config, StateManager, Transaction } from "../..";

describe("State Manager", () => {
  const caller = Address.fromString(
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
  );
  const receiver = Address.fromString(
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
  );

  let stateManager: StateManager;

  beforeEach(function () {
    stateManager = new StateManager();
  });

  // TODO: insertBlock, setAccountCode, setAccountStorageSlot
  it("getAccountByAddress", async () => {
    await stateManager.insertAccount(caller.buf);
    let account = await stateManager.getAccountByAddress(caller.buf);

    expect(account?.balance).to.equal(0n);
    expect(account?.nonce).to.equal(0n);
  });

  it("setAccountBalance", async () => {
    await stateManager.insertAccount(caller.buf);
    await stateManager.modifyAccount(
      caller.buf,
      async function (account: Account): Promise<Account> {
        return {
          balance: 100n,
          nonce: account.nonce,
          codeHash: account.codeHash,
          code: account.code,
        };
      }
    );

    let account = await stateManager.getAccountByAddress(caller.buf);

    expect(account?.balance).to.equal(100n);
    expect(account?.nonce).to.equal(0n);
  });

  it("setAccountNonce", async () => {
    await stateManager.insertAccount(caller.buf);
    await stateManager.modifyAccount(
      caller.buf,
      async function (account: Account): Promise<Account> {
        return {
          balance: account.balance,
          nonce: 5n,
          codeHash: account.codeHash,
          code: account.code,
        };
      }
    );

    let account = await stateManager.getAccountByAddress(caller.buf);

    expect(account?.balance).to.equal(0n);
    expect(account?.nonce).to.equal(5n);
  });
});
