import { assert } from "chai";
import { EventEmitter } from "events";
import { EthereumProvider } from "web3x/providers/ethereum-provider";
import { HttpProvider } from "web3x/providers/http";
import { JsonRpcRequest, JsonRpcResponse } from "web3x/providers/jsonrpc";
import { Callback, LegacyProvider } from "web3x/providers/legacy-provider";

import { EthereumLocalAccountsProvider } from "../../../src/core/providers/local-accounts";

describe("ethereum provider", () => {
  let ethereum: EthereumProvider;
  let wrapper: EthereumLocalAccountsProvider;
  // let wrapperSend: (method: string, params?: any[]) => Promise<JsonRPCResponse>;
  const accounts = [
    "d78629ec714c4c72e04e294bb21615ddcb4d15dbb63db0bd84a8e084c7134c13"
  ];
  const chainId = 5777;

  beforeEach(() => {
    ethereum = new HttpProvider("http://127.0.0.1:8545");
    wrapper = new EthereumLocalAccountsProvider(ethereum, accounts, chainId);
    // wrapperSend = util.promisify(wrapper.send.bind(wrapper));
  });

  it("eth_accounts", async () => {
    const response = await wrapper.send("eth_accounts");
    assert.equal(response, accounts);
  });

  it("eth_requestAccounts", async () => {
    const response = await wrapper.send("eth_requestAccounts");
    assert.deepEqual(response, accounts);
  });

  it("fail transaction", async () => {
    try {
      await wrapper.send("eth_sendTransaction");
      assert.fail("This should have thrown");
    } catch (err) {
      assert.equal(err!.message, "missing required parameters");
    }
  });

  it("successful transaction", async () => {
    const response: string = await wrapper.send("eth_sendTransaction", [
      "0x4f3e91d2cacd82fffd1f33a0d26d4078401986e9",
      "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d",
      500000,
      3721975,
      440000000
    ]);
    assert.equal(response.length, 66);
  });
});
