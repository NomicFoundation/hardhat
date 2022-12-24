import { expect } from "chai";
import { Address, KECCAK256_NULL } from "@nomicfoundation/ethereumjs-util";

import { AccountData, StateManager } from "../..";

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
    await stateManager.insertAccount(caller.buf, {
      nonce: 0n,
      balance: 0n,
      codeHash: KECCAK256_NULL,
    });
    let account = await stateManager.getAccountByAddress(caller.buf);

    expect(account?.balance).to.equal(0n);
    expect(account?.nonce).to.equal(0n);
  });

  it("setAccountBalance", async () => {
    await stateManager.insertAccount(caller.buf, {
      nonce: 0n,
      balance: 0n,
      codeHash: KECCAK256_NULL,
    });

    await stateManager.modifyAccount(
      caller.buf,
      async function (
        _balance: bigint,
        nonce: bigint,
        code: Buffer | undefined
      ): Promise<AccountData> {
        return {
          balance: 100n,
          nonce,
          code,
        };
      }
    );

    let account = await stateManager.getAccountByAddress(caller.buf);

    expect(account?.balance).to.equal(100n);
    expect(account?.nonce).to.equal(0n);
    expect(account?.codeHash).to.eql(KECCAK256_NULL);
  });

  it("setAccountNonce", async () => {
    await stateManager.insertAccount(caller.buf, {
      nonce: 0n,
      balance: 0n,
      codeHash: KECCAK256_NULL,
    });

    await stateManager.modifyAccount(
      caller.buf,
      async function (
        balance: bigint,
        nonce: bigint,
        code: Buffer | undefined
      ): Promise<AccountData> {
        return {
          balance,
          nonce: 5n,
          code,
        };
      }
    );

    let account = await stateManager.getAccountByAddress(caller.buf);

    expect(account?.balance).to.equal(0n);
    expect(account?.nonce).to.equal(5n);
    expect(account?.codeHash).to.eql(KECCAK256_NULL);
  });
});
