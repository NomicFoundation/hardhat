import { assert } from "chai";
import Transaction from "ethereumjs-tx";
import { EventEmitter } from "events";

import { getConfig } from "../../../src/core/config";
import { IEthereumProvider } from "../../../src/core/providers/ethereum";
import {
  createLocalAccountsProvider,
  hashTransaction,
  signTransaction
} from "../../../src/core/providers/local-accounts";
import { expectErrorAsync } from "../../helpers/errors";
import { useFixtureProject } from "../../helpers/project";

class MockProvider extends EventEmitter implements IEthereumProvider {
  public async send(method: string, params?: any[]): Promise<any> {
    if (method === "eth_getTransactionCount") {
      return 0x08;
    }
    if (method === "eth_sendRawTransaction") {
      if (params !== undefined) {
        return params[0];
      }
    }
  }
}

describe("ethereum provider", () => {
  let mock: MockProvider;
  let wrapper: IEthereumProvider;

  let accounts: string[] = [];
  const chainId = 3;
  useFixtureProject("config-project");

  beforeEach(() => {
    const [config, _] = getConfig();
    accounts = config.networks.develop.accounts;
    mock = new MockProvider();
    wrapper = createLocalAccountsProvider(mock, accounts, chainId);
  });

  it("eth_accounts", async () => {
    const response = await wrapper.send("eth_accounts");
    // This should check that the address is derivated from the private key
    assert.equal(response[0].length, 20);
  });

  it("eth_requestAccounts", async () => {
    const response = await wrapper.send("eth_requestAccounts");
    assert.equal(response[0].length, 20);
  });

  it("eth_sign", async () => {
    await expectErrorAsync(() => {
      return wrapper.send("eth_sign");
    }, "eth_sign is not supported yet");
  });

  it("sendTransaction without specify gas", async () => {
    const params = [
      {
        from: "0xf7abeea1b1b97ef714bc9a118b0f095ec54f8221",
        to: "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d",
        gasPrice: 0x3b9aca00,
        nonce: 0x8,
        chainId: 3
      }
    ];

    await expectErrorAsync(
      () => wrapper.send("eth_sendTransaction", params),
      "Missing gas"
    );
  });

  it("sendTransaction without specify gas nor gas price", async () => {
    const params = [
      {
        from: "0xf7abeea1b1b97ef714bc9a118b0f095ec54f8221",
        to: "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d",
        nonce: 0x8,
        chainId: 3
      }
    ];

    await expectErrorAsync(
      () => wrapper.send("eth_sendTransaction", params),
      "Missing gas"
    );
  });

  it("should resolve transaction nonce", async () => {
    const params = [
      {
        from: "0xf7abeea1b1b97ef714bc9a118b0f095ec54f8221",
        to: "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d",
        gas: 21000,
        gasPrice: 0x3b9aca00,
        chainId: 3
      }
    ];

    const response = await wrapper.send("eth_sendTransaction", params);
    assert.isDefined(response);
  });

  it("should fail is no params are given", async () => {
    await expectErrorAsync(
      () => wrapper.send("eth_sendTransaction"),
      /undefined/
    );
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

    assert.equal(actualHash, expectedTxHash);
  });
});
