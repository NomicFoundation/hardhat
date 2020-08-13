import { assert } from "chai";
import Account from "ethereumjs-account";
import {
  BN,
  keccak256,
  KECCAK256_NULL,
  KECCAK256_NULL_S,
} from "ethereumjs-util";

import { JsonRpcClient } from "../../../../../src/internal/buidler-evm/jsonrpc/client";
import {
  CheckpointError,
  NotSupportedError,
} from "../../../../../src/internal/buidler-evm/provider/fork/errors";
import { ForkStateManager } from "../../../../../src/internal/buidler-evm/provider/fork/ForkStateManager";
import {
  randomAddressBuffer,
  randomHashBuffer,
} from "../../../../../src/internal/buidler-evm/provider/fork/random";
import {
  DAI_ADDRESS,
  DAI_TOTAL_SUPPLY_STORAGE_POSITION,
  EMPTY_ACCOUNT_ADDRESS,
  INFURA_URL,
  WETH_ADDRESS,
} from "../../helpers/constants";

describe("ForkStateManager", () => {
  let client: JsonRpcClient;
  let blockNumber: BN;
  let fsm: ForkStateManager;

  before(async () => {
    client = JsonRpcClient.forUrl(INFURA_URL);
    blockNumber = await client.getLatestBlockNumber();
  });

  beforeEach(async () => {
    fsm = new ForkStateManager(client, blockNumber);
  });

  it("can be constructed", () => {
    assert.instanceOf(fsm, ForkStateManager);
  });

  describe("copy", () => {
    /* tslint:disable no-string-literal */
    it("creates a new object with the same state", async () => {
      const fsmCopy = fsm.copy();

      assert.equal(fsmCopy["_jsonRpcClient"], fsm["_jsonRpcClient"]);
      assert.isTrue(fsmCopy["_forkBlockNumber"].eq(fsm["_forkBlockNumber"]));
      assert.equal(fsmCopy["_state"], fsm["_state"]);
      assert.equal(fsmCopy["_stateRoot"], fsm["_stateRoot"]);
      assert.equal(fsmCopy["_stateRootToState"], fsm["_stateRootToState"]);
    });
    /* tslint:enable no-string-literal */
  });

  describe("getAccount", () => {
    it("can get account object", async () => {
      const code = await client.getCode(WETH_ADDRESS, "latest");
      const codeHash = keccak256(code);
      const account = await fsm.getAccount(WETH_ADDRESS);

      assert.isTrue(new BN(account.balance).gtn(0));
      assert.isTrue(new BN(account.nonce).eqn(1));
      assert.equal(account.codeHash.toString("hex"), codeHash.toString("hex"));
      assert.notEqual(account.stateRoot.toString("hex"), "");
    });

    it("can get non-existent account", async () => {
      const account = await fsm.getAccount(EMPTY_ACCOUNT_ADDRESS);

      assert.isTrue(new BN(account.balance).eqn(0));
      assert.isTrue(new BN(account.nonce).eqn(0));
      assert.equal(account.codeHash.toString("hex"), KECCAK256_NULL_S);
      assert.notEqual(account.stateRoot.toString("hex"), "");
    });

    it("works with accounts created locally", async () => {
      const address = randomAddressBuffer();
      const code = Buffer.from("b16b00b1e5", "hex");
      const codeHash = keccak256(code);
      await fsm.putContractCode(address, code);
      await fsm.putAccount(
        address,
        new Account({ nonce: new BN(1), balance: new BN(2), codeHash })
      );

      const account = await fsm.getAccount(address);
      assert.isTrue(new BN(account.nonce).eqn(1));
      assert.isTrue(new BN(account.balance).eqn(2));
      assert.equal(account.codeHash.toString("hex"), codeHash.toString("hex"));
      assert.notEqual(account.stateRoot.toString("hex"), "");
    });

    it("works with accounts modified locally", async () => {
      const code = Buffer.from("b16b00b1e5", "hex");
      await fsm.putContractCode(WETH_ADDRESS, code);
      const account = await fsm.getAccount(WETH_ADDRESS);

      assert.isTrue(new BN(account.balance).gtn(0));
      assert.isTrue(new BN(account.nonce).eqn(1));
      assert.equal(
        account.codeHash.toString("hex"),
        keccak256(code).toString("hex")
      );
      assert.notEqual(account.stateRoot.toString("hex"), "");
    });
  });

  describe("putAccount", () => {
    it("can create a new account", async () => {
      const address = randomAddressBuffer();
      const toPut = new Account({ nonce: new BN(69), balance: new BN(420) });
      await fsm.putAccount(address, toPut);
      const account = await fsm.getAccount(address);

      assert.isTrue(new BN(account.nonce).eqn(69));
      assert.isTrue(new BN(account.balance).eqn(420));
      assert.isTrue(account.codeHash.equals(KECCAK256_NULL));
    });

    it("can change balance and nonce", async () => {
      const account = await fsm.getAccount(WETH_ADDRESS);
      const increasedNonce = new BN(account.nonce).addn(1);
      const increasedBalance = new BN(account.balance).addn(1);
      await fsm.putAccount(
        WETH_ADDRESS,
        new Account({
          nonce: increasedNonce,
          balance: increasedBalance,
          codeHash: account.codeHash,
        })
      );
      const updatedAccount = await fsm.getAccount(WETH_ADDRESS);
      assert.isTrue(new BN(updatedAccount.nonce).eq(increasedNonce));
      assert.isTrue(new BN(updatedAccount.balance).eq(increasedBalance));
      assert.isTrue(updatedAccount.codeHash.equals(account.codeHash));
    });

    it("can change the code stored if the codeHash is the hash of null", async () => {
      const toPut = new Account({ nonce: new BN(69), balance: new BN(420) });
      await fsm.putAccount(WETH_ADDRESS, toPut);

      const wethContract = await fsm.getAccount(WETH_ADDRESS);
      assert.isTrue(wethContract.codeHash.equals(KECCAK256_NULL));
    });
  });

  describe("accountIsEmpty", () => {
    it("returns true for empty accounts", async () => {
      const address = randomAddressBuffer();
      const result = await fsm.accountIsEmpty(address);
      assert.isTrue(result);
    });

    it("returns false for accounts with non-zero nonce", async () => {
      const address = randomAddressBuffer();
      await fsm.putAccount(address, new Account({ nonce: new BN(123) }));
      const result = await fsm.accountIsEmpty(address);
      assert.isFalse(result);
    });

    it("returns false for accounts with non-zero balance", async () => {
      const address = randomAddressBuffer();
      await fsm.putAccount(address, new Account({ balance: new BN(123) }));
      const result = await fsm.accountIsEmpty(address);
      assert.isFalse(result);
    });

    it("returns false for accounts with non-empty code", async () => {
      const address = randomAddressBuffer();
      await fsm.putContractCode(address, Buffer.from("fafadada", "hex"));
      const result = await fsm.accountIsEmpty(address);
      assert.isFalse(result);
    });
  });

  describe("getContractCode", () => {
    it("can get contract code", async () => {
      const remoteCode = await client.getCode(DAI_ADDRESS, blockNumber);
      const fsmCode = await fsm.getContractCode(DAI_ADDRESS);

      assert.equal(fsmCode.toString("hex"), remoteCode.toString("hex"));
    });

    it("can get code of an account modified locally", async () => {
      await fsm.putContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION,
        Buffer.from([69, 4, 20])
      );
      const remoteCode = await client.getCode(DAI_ADDRESS, blockNumber);
      const fsmCode = await fsm.getContractCode(DAI_ADDRESS);

      assert.equal(fsmCode.toString("hex"), remoteCode.toString("hex"));
    });
  });

  describe("putContractCode", () => {
    it("can override contract code", async () => {
      const code = Buffer.from("deadbeef", "hex");

      await fsm.putContractCode(DAI_ADDRESS, code);
      const fsmCode = await fsm.getContractCode(DAI_ADDRESS);

      assert.equal(fsmCode.toString("hex"), code.toString("hex"));
    });

    it("can set code of an existing account", async () => {
      const address = randomAddressBuffer();
      const toPut = new Account({ nonce: new BN(69), balance: new BN(420) });
      await fsm.putAccount(address, toPut);

      const code = Buffer.from("feedface", "hex");
      await fsm.putContractCode(address, code);
      const fsmCode = await fsm.getContractCode(address);
      assert.equal(fsmCode.toString("hex"), code.toString("hex"));
    });
  });

  describe("getContractStorage", () => {
    it("can get contract storage value", async () => {
      const remoteValue = await client.getStorageAt(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION,
        blockNumber
      );
      const fsmValue = await fsm.getContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION
      );

      assert.equal(fsmValue.toString("hex"), remoteValue.toString("hex"));
    });
  });

  describe("getOriginalContractStorage", () => {
    it("can get contract storage value", async () => {
      const remoteValue = await client.getStorageAt(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION,
        blockNumber
      );
      const fsmValue = await fsm.getOriginalContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION
      );

      assert.equal(fsmValue.toString("hex"), remoteValue.toString("hex"));
    });

    it("caches original storage value on first call and returns it for subsequent calls", async () => {
      const newValue = Buffer.from("deadbeef", "hex");
      const originalValue = await fsm.getOriginalContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION
      );
      assert.notEqual(originalValue.toString("hex"), newValue.toString("hex"));

      await fsm.putContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION,
        newValue
      );

      const cachedValue = await fsm.getOriginalContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION
      );
      assert.equal(cachedValue.toString("hex"), originalValue.toString("hex"));
    });

    it("retains original storage value after setStateRoot call", async () => {
      const newValue = Buffer.from("deadbeef", "hex");
      const stateRoot = await fsm.getStateRoot();
      const originalValue = await fsm.getOriginalContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION
      );
      await fsm.putContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION,
        newValue
      );
      await fsm.setStateRoot(stateRoot);
      await fsm.putContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION,
        newValue
      );
      const cachedValue = await fsm.getOriginalContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION
      );
      assert.equal(cachedValue.toString("hex"), originalValue.toString("hex"));
    });
  });

  describe("putContractStorage", () => {
    it("can override storage value", async () => {
      const value = Buffer.from("feedface", "hex");

      await fsm.putContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION,
        value
      );
      const fsmValue = await fsm.getContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION
      );

      assert.equal(fsmValue.toString("hex"), value.toString("hex"));
    });

    it("can set storage value of an existing account", async () => {
      const address = randomAddressBuffer();
      const toPut = new Account({ nonce: new BN(69), balance: new BN(420) });
      await fsm.putAccount(address, toPut);

      const value = Buffer.from("feedface", "hex");
      await fsm.putContractStorage(address, Buffer.from([1]), value);
      const fsmValue = await fsm.getContractStorage(address, Buffer.from([1]));
      assert.equal(fsmValue.toString("hex"), value.toString("hex"));
    });
  });

  /* tslint:disable no-string-literal */
  describe("checkpoint", () => {
    it("stores current state root on the stack", async () => {
      const stateRoot = await fsm.getStateRoot();
      await fsm.checkpoint();
      assert.deepEqual(fsm["_stateCheckpoints"], [stateRoot.toString("hex")]);
    });

    it("allows to checkpoint the same state root twice", async () => {
      const stateRoot = await fsm.getStateRoot();
      await fsm.checkpoint();
      await fsm.checkpoint();
      assert.deepEqual(fsm["_stateCheckpoints"], [
        stateRoot.toString("hex"),
        stateRoot.toString("hex"),
      ]);
    });

    it("allows to checkpoint different state roots", async () => {
      const stateRootOne = await fsm.getStateRoot();
      await fsm.checkpoint();
      await fsm.putContractCode(
        randomAddressBuffer(),
        Buffer.from("deadbeef", "hex")
      );
      const stateRootTwo = await fsm.getStateRoot();
      await fsm.checkpoint();
      assert.deepEqual(fsm["_stateCheckpoints"], [
        stateRootOne.toString("hex"),
        stateRootTwo.toString("hex"),
      ]);
    });
  });

  describe("commit", () => {
    it("rejects if no checkpoint was made", async () => {
      await assert.isRejected(fsm.commit(), CheckpointError, "commit");
    });

    it("does not change current state root", async () => {
      await fsm.checkpoint();
      await fsm.putContractCode(
        randomAddressBuffer(),
        Buffer.from("deadbeef", "hex")
      );
      const beforeRoot = await fsm.getStateRoot();
      await fsm.commit();
      const afterRoot = await fsm.getStateRoot();
      assert.equal(afterRoot.toString("hex"), beforeRoot.toString("hex"));
    });

    it("removes the latest state root from the stack", async () => {
      const stateRoot = await fsm.getStateRoot();
      await fsm.checkpoint();
      await fsm.checkpoint();
      await fsm.commit();
      assert.deepEqual(fsm["_stateCheckpoints"], [stateRoot.toString("hex")]);
    });
  });

  describe("revert", () => {
    it("rejects if no checkpoint was made", async () => {
      await assert.isRejected(fsm.revert(), CheckpointError, "revert");
    });

    it("reverts the current state root back to the committed state", async () => {
      const initialRoot = await fsm.getStateRoot();
      await fsm.checkpoint();
      await fsm.putContractCode(
        randomAddressBuffer(),
        Buffer.from("deadbeef", "hex")
      );
      await fsm.revert();
      const stateRoot = await fsm.getStateRoot();
      assert.equal(stateRoot.toString("hex"), initialRoot.toString("hex"));
    });

    it("does not revert more than one checkpoint back", async () => {
      const address = randomAddressBuffer();
      await fsm.checkpoint();
      await fsm.putContractCode(address, Buffer.from("deadbeef", "hex"));
      await fsm.checkpoint();
      await fsm.putContractCode(address, Buffer.from("feedface", "hex"));
      await fsm.revert();
      const code = await fsm.getContractCode(address);
      assert.equal(code.toString("hex"), "deadbeef");
    });

    it("removes the latest state root from the stack", async () => {
      const stateRoot = await fsm.getStateRoot();
      await fsm.checkpoint();
      await fsm.checkpoint();
      await fsm.revert();
      assert.deepEqual(fsm["_stateCheckpoints"], [stateRoot.toString("hex")]);
    });
  });
  /* tslint:enable no-string-literal */

  describe("clearContractStorage", () => {
    it("can clear all locally set values", async () => {
      const value = Buffer.from("feedface", "hex");
      const address = randomAddressBuffer();
      const position = Buffer.from([2]);
      await fsm.putContractStorage(address, position, value);
      await fsm.clearContractStorage(address);
      const clearedValue = await fsm.getContractStorage(address, position);
      assert.equal(clearedValue.toString("hex"), "0".repeat(64));
    });

    it("can clear all remote values", async () => {
      const value = await fsm.getContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION
      );
      assert.notEqual(value.toString("hex"), "0".repeat(64));
      await fsm.clearContractStorage(DAI_ADDRESS);
      const clearedValue = await fsm.getContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION
      );
      assert.equal(clearedValue.toString("hex"), "0".repeat(64));
    });

    it("can clear remote values not previously read", async () => {
      await fsm.clearContractStorage(DAI_ADDRESS);
      const clearedValue = await fsm.getContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION
      );
      assert.equal(clearedValue.toString("hex"), "0".repeat(64));
    });
  });

  describe("getStateRoot", () => {
    it("returns current state root", async () => {
      const root = await fsm.getStateRoot();
      assert.notEqual(root.toString("hex"), "");
    });

    it("returns the same state root if no storage was modified", async () => {
      const root1 = await fsm.getStateRoot();
      const root2 = await fsm.getStateRoot();
      assert.equal(root1.toString("hex"), root2.toString("hex"));
    });

    it("returns a different state root after storage modification", async () => {
      const root1 = await fsm.getStateRoot();
      await fsm.putContractCode(
        randomAddressBuffer(),
        Buffer.from("deadbeef", "hex")
      );
      const root2 = await fsm.getStateRoot();
      assert.notEqual(root1.toString("hex"), root2.toString("hex"));
    });
  });

  describe("setStateRoot", () => {
    it("throws error when an unknown state root is passed", async () => {
      await assert.isRejected(
        fsm.setStateRoot(randomHashBuffer()),
        Error,
        "Unknown state root"
      );
    });

    it("allows to change current state root", async () => {
      const beforeRoot = await fsm.getStateRoot();
      await fsm.putContractCode(
        randomAddressBuffer(),
        Buffer.from("deadbeef", "hex")
      );
      const afterRoot = await fsm.getStateRoot();
      await fsm.setStateRoot(beforeRoot);
      const restoredRoot = await fsm.getStateRoot();
      assert.equal(restoredRoot.toString("hex"), beforeRoot.toString("hex"));
      assert.notEqual(afterRoot.toString("hex"), beforeRoot.toString("hex"));
    });

    it("allows to change the state", async () => {
      const beforeRoot = await fsm.getStateRoot();
      const address = randomAddressBuffer();
      assert.equal((await fsm.getContractCode(address)).toString("hex"), "");
      await fsm.putContractCode(address, Buffer.from("deadbeef", "hex"));
      assert.equal(
        (await fsm.getContractCode(address)).toString("hex"),
        "deadbeef"
      );
      await fsm.setStateRoot(beforeRoot);
      assert.equal((await fsm.getContractCode(address)).toString("hex"), "");
    });
  });

  describe("dumpStorage", () => {
    it("throws not supported error", async () => {
      await assert.isRejected(
        fsm.dumpStorage(randomAddressBuffer()),
        NotSupportedError,
        "dumpStorage"
      );
    });
  });

  describe("hasGenesisState", () => {
    it("throws not supported error", async () => {
      await assert.isRejected(
        fsm.hasGenesisState(),
        NotSupportedError,
        "hasGenesisState"
      );
    });
  });

  describe("generateCanonicalGenesis", () => {
    it("throws not supported error", async () => {
      await assert.isRejected(
        fsm.generateCanonicalGenesis(),
        NotSupportedError,
        "generateCanonicalGenesis"
      );
    });
  });

  describe("generateGenesis", () => {
    it("throws not supported error", async () => {
      await assert.isRejected(
        fsm.generateGenesis(null),
        NotSupportedError,
        "generateGenesis"
      );
    });
  });

  describe("_clearOriginalStorageCache", () => {
    it("makes the subsequent call to getOriginalContractStorage return a fresh value", async () => {
      const newValue = Buffer.from("deadbeef", "hex");
      const originalValue = await fsm.getOriginalContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION
      );
      assert.notEqual(originalValue.toString("hex"), newValue.toString("hex"));

      await fsm.putContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION,
        newValue
      );
      fsm._clearOriginalStorageCache();

      const freshValue = await fsm.getOriginalContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION
      );
      assert.equal(freshValue.toString("hex"), newValue.toString("hex"));
    });
  });

  describe("touchAccount", () => {
    it("does not throw an error", () => {
      fsm.touchAccount(randomAddressBuffer());
    });
  });

  describe("cleanupTouchedAccounts", () => {
    it("does not throw an error", async () => {
      await fsm.cleanupTouchedAccounts();
    });
  });
});
