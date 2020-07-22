import { assert } from "chai";
import { BN } from "ethereumjs-util";

import { JsonRpcClient } from "../../../../../src/internal/buidler-evm/jsonrpc/client";
import { ForkStateManager } from "../../../../../src/internal/buidler-evm/provider/fork/ForkStateManager";

// reused from ethers.js
const INFURA_URL = `https://mainnet.infura.io/v3/84842078b09946638c03157f83405213`;

describe("ForkStateManager", () => {
  it("can be constructed", () => {
    const client = JsonRpcClient.forUrl(INFURA_URL);
    const fsm = new ForkStateManager(client, new BN(0));
    assert.instanceOf(fsm, ForkStateManager);
  });

  it("can get contract code", async () => {
    const client = JsonRpcClient.forUrl(INFURA_URL);
    const blockNumber = await client.getLatestBlockNumber();
    const fsm = new ForkStateManager(client, blockNumber);

    const daiAddress = Buffer.from(
      "6b175474e89094c44da98b954eedeac495271d0f",
      "hex"
    );

    const remoteCode = await client.getCode(daiAddress, blockNumber);
    const fsmCode = await fsm.getContractCode(daiAddress);

    assert.equal(fsmCode.toString("hex"), remoteCode.toString("hex"));
  });

  it("can override contract code", async () => {
    const client = JsonRpcClient.forUrl(INFURA_URL);
    const blockNumber = await client.getLatestBlockNumber();
    const fsm = new ForkStateManager(client, blockNumber);

    const daiAddress = Buffer.from(
      "6b175474e89094c44da98b954eedeac495271d0f",
      "hex"
    );
    const code = Buffer.from("deadbeef", "hex");

    await fsm.putContractCode(daiAddress, code);
    const fsmCode = await fsm.getContractCode(daiAddress);

    assert.equal(fsmCode.toString("hex"), code.toString("hex"));
  });
});
