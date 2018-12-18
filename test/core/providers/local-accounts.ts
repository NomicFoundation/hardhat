import { assert } from "chai";
import Transaction from "ethereumjs-tx";
import { EventEmitter } from "events";

import { getConfig } from "../../../src/core/config";
import { IEthereumProvider } from "../../../src/core/providers/ethereum";
import {
  EthereumLocalAccountsProvider,
  hashTransaction,
  signTransaction
} from "../../../src/core/providers/local-accounts";
import { useFixtureProject } from "../../helpers/project";

class MockProvider extends EventEmitter implements IEthereumProvider {
  public async send(method: string, params?: any[]): Promise<any> {
    if (method === "eth_getTransactionCount") {
      return 0x08;
    }
  }
}

describe("ethereum provider", () => {
  let mock: MockProvider;
  let wrapper: EthereumLocalAccountsProvider;

  let accounts: string[] = [];
  const chainId = 3;
  useFixtureProject("config-project");

  beforeEach(() => {
    const [config, _] = getConfig();
    accounts = config.networks.develop.accounts;
    mock = new MockProvider();
    wrapper = new EthereumLocalAccountsProvider(mock, accounts, chainId);
  });

  it("eth_accounts", async () => {
    const response = await wrapper.send("eth_accounts");
    assert.equal(response, accounts);
  });

  it("eth_requestAccounts", async () => {
    const response = await wrapper.send("eth_requestAccounts");
    assert.deepEqual(response, accounts);
  });

  it("given two identical tx the signedTx should be the same", async () => {
    const tx = new Transaction({
      from: "0xf7abeea1b1b97ef714bc9a118b0f095ec54f8221",
      to: "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d",
      gas: 21000,
      gasPrice: 0x3b9aca00,
      nonce: 0x8,
      chainId: 3
    });

    const expectedTxHash =
      "f99366872bcfa52fd4a6e74da809fa48cfdb61b598c99776eb94db22810722a6";

    signTransaction(tx, accounts[0]);
    const actualHash = hashTransaction(tx);

    // console.log(signedTx, actualHash);
    assert.equal(actualHash, expectedTxHash);
  });
});
