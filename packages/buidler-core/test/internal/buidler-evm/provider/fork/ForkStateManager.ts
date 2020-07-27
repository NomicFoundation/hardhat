import { assert } from "chai";
import { BN } from "ethereumjs-util";

import { JsonRpcClient } from "../../../../../src/internal/buidler-evm/jsonrpc/client";
import { ForkStateManager } from "../../../../../src/internal/buidler-evm/provider/fork/ForkStateManager";

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
});
