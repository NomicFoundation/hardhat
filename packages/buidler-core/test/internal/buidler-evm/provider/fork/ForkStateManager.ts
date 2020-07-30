import { assert } from "chai";
import { BN } from "ethereumjs-util";

import { JsonRpcClient } from "../../../../../src/internal/buidler-evm/jsonrpc/client";
import { NotSupportedError } from "../../../../../src/internal/buidler-evm/provider/fork/errors";
import { ForkStateManager } from "../../../../../src/internal/buidler-evm/provider/fork/ForkStateManager";
import {
  randomAddressBuffer,
  randomHashBuffer,
} from "../../../../../src/internal/buidler-evm/provider/fork/random";

// reused from ethers.js
const INFURA_URL = `https://mainnet.infura.io/v3/84842078b09946638c03157f83405213`;

const DAI_ADDRESS = Buffer.from(
  "6b175474e89094c44da98b954eedeac495271d0f",
  "hex"
);
const DAI_TOTAL_SUPPLY_STORAGE_POSITION = Buffer.from([1]);

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

  describe("getContractCode", () => {
    it("can get contract code", async () => {
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
});
