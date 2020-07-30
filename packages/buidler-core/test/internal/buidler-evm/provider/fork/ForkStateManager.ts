import { assert } from "chai";
import Account from "ethereumjs-account";
import { BN, keccak256, KECCAK256_NULL_S } from "ethereumjs-util";

import { JsonRpcClient } from "../../../../../src/internal/buidler-evm/jsonrpc/client";
import { NotSupportedError } from "../../../../../src/internal/buidler-evm/provider/fork/errors";
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

  beforeEach(async () => {
    client = JsonRpcClient.forUrl(INFURA_URL);
    blockNumber = await client.getLatestBlockNumber();
    fsm = new ForkStateManager(client, blockNumber);
  });

  it("can be constructed", () => {
    assert.instanceOf(fsm, ForkStateManager);
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
      await fsm.putContractCode(address, code);
      // TODO: change balance
      // TODO: change nonce

      const account = await fsm.getAccount(address);
      assert.equal(
        account.codeHash.toString("hex"),
        keccak256(code).toString("hex")
      );
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
    it("can change balance and nonce", async () => {
      const address = randomAddressBuffer();
      const toPut = new Account({ nonce: new BN(69), balance: new BN(420) });
      await fsm.putAccount(address, toPut);
      const account = await fsm.getAccount(address);

      assert.isTrue(new BN(account.nonce).eqn(69));
      assert.isTrue(new BN(account.balance).eqn(420));
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
  });

  describe("checkpoint", () => {
    it("throws not supported error", async () => {
      const error = await fsm.checkpoint().catch((e) => e);
      assert.instanceOf(error, NotSupportedError);
    });
  });

  describe("commit", () => {
    it("throws not supported error", async () => {
      const error = await fsm.commit().catch((e) => e);
      assert.instanceOf(error, NotSupportedError);
    });
  });

  describe("revert", () => {
    it("throws not supported error", async () => {
      const error = await fsm.revert().catch((e) => e);
      assert.instanceOf(error, NotSupportedError);
    });
  });

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
      const error = await fsm.setStateRoot(randomHashBuffer()).catch((e) => e);
      assert.instanceOf(error, Error);
    });

    it("allows to change current state root", async () => {
      const beforeRoot = await fsm.getStateRoot();
      const address = randomAddressBuffer();
      await fsm.putContractCode(address, Buffer.from("deadbeef", "hex"));
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
      const error = await fsm
        .dumpStorage(randomAddressBuffer())
        .catch((e) => e);
      assert.instanceOf(error, NotSupportedError);
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
});
