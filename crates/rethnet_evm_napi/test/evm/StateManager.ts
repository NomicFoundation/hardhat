import { expect } from "chai";
import { Address, KECCAK256_NULL } from "@nomicfoundation/ethereumjs-util";

import { Account, Bytecode, StateManager } from "../..";

describe("State Manager", () => {
  const caller = Address.fromString(
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
  );
  const receiver = Address.fromString(
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
  );

  const stateManagers = [{name: "default", getStateManager: () => new StateManager()}];

  const alchemyUrl = process.env.ALCHEMY_URL;
  if (alchemyUrl === undefined) {
    console.log("WARNING: skipping fork tests because the ALCHEMY_URL environment variable is undefined");
  } else {
    stateManagers.push(
      {name: "fork", getStateManager: () => StateManager.withFork(alchemyUrl, 16220843)}
    );
  }

  for (const {name, getStateManager} of stateManagers) {
    describe(`With the ${name} StateManager`, () => {
      let stateManager: StateManager;

      beforeEach(function () {
        stateManager = getStateManager();
      });

      // TODO: insertBlock, setAccountCode, setAccountStorageSlot
      it("getAccountByAddress", async () => {
        await stateManager.insertAccount(caller.buf, {
          nonce: 0n,
          balance: 0n,
        });
        let account = await stateManager.getAccountByAddress(caller.buf);

        expect(account?.balance).to.equal(0n);
        expect(account?.nonce).to.equal(0n);
      });

      it("setAccountBalance", async () => {
        await stateManager.insertAccount(caller.buf, {
          nonce: 0n,
          balance: 0n,
        });

        await stateManager.modifyAccount(
          caller.buf,
          async function (
            _balance: bigint,
            nonce: bigint,
        code: Bytecode | undefined
      ): Promise<Account> {
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
      });

      it("setAccountNonce", async () => {
        await stateManager.insertAccount(caller.buf, {
          nonce: 0n,
          balance: 0n,
        });

        await stateManager.modifyAccount(
          caller.buf,
          async function (
            balance: bigint,
            nonce: bigint,
        code: Bytecode | undefined
      ): Promise<Account> {
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
      });
    });
  }
});
