import { assert } from "chai";
import { BN } from "ethereumjs-util";

import { JsonRpcClient } from "../../../../../src/internal/buidler-evm/jsonrpc/client";
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

  it("can get contract code", async () => {
    const remoteCode = await client.getCode(DAI_ADDRESS, blockNumber);
    const fsmCode = await fsm.getContractCode(DAI_ADDRESS);

    assert.equal(fsmCode.toString("hex"), remoteCode.toString("hex"));
  });

  it("can override contract code", async () => {
    const code = Buffer.from("deadbeef", "hex");

    await fsm.putContractCode(DAI_ADDRESS, code);
    const fsmCode = await fsm.getContractCode(DAI_ADDRESS);

    assert.equal(fsmCode.toString("hex"), code.toString("hex"));
  });

  it("can get contract storage value", async () => {
    const totalSupplyPosition = Buffer.from([1]);
    const remoteValue = await client.getStorageAt(
      DAI_ADDRESS,
      totalSupplyPosition,
      blockNumber
    );
    const fsmValue = await fsm.getContractStorage(
      DAI_ADDRESS,
      totalSupplyPosition
    );

    assert.equal(fsmValue.toString("hex"), remoteValue.toString("hex"));
  });

  it("can override storage value", async () => {
    const position = Buffer.from([1]);
    const value = Buffer.from("feedface", "hex");

    await fsm.putContractStorage(DAI_ADDRESS, position, value);
    const fsmValue = await fsm.getContractStorage(DAI_ADDRESS, position);

    assert.equal(fsmValue.toString("hex"), value.toString("hex"));
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
});
