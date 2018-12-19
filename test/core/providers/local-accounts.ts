import { assert } from "chai";
import { bufferToHex, privateToAddress } from "ethereumjs-util";
import { EventEmitter } from "events";

import { IEthereumProvider } from "../../../src/core/providers/ethereum";

import { createLocalAccountsProvider } from "../../../src/core/providers/local-accounts";
import { expectErrorAsync } from "../../helpers/errors";

class MockProvider extends EventEmitter implements IEthereumProvider {
  public transactionsCountParams: any[] | undefined = undefined;

  public async send(method: string, params?: any[]): Promise<any> {
    if (method === "eth_getTransactionCount") {
      this.transactionsCountParams = params;
      return 0x08;
    }

    if (method === "net_version") {
      return 123;
    }

    return params;
  }
}

function privateKeyToAddress(privateKey: string): string {
  return bufferToHex(privateToAddress(privateKey)).toLowerCase();
}

describe("Local accounts provider", () => {
  let mock: MockProvider;
  let wrapper: IEthereumProvider;

  let accounts: string[] = [];

  beforeEach(() => {
    accounts = [
      "0xb2e31025a2474b37e4c2d2931929a00b5752b98a3af45e3fd9a62ddc3cdf370e",
      "0x6d7229c1db5892730b84b4bc10543733b72cabf4cd3130d910faa8e459bb8eca",
      "0x6d4ec871d9b5469119bbfc891e958b6220d076a6849006098c370c8af5fc7776",
      "0xec02c2b7019e75378a05018adc30a0252ba705670acb383a1d332e57b0b792d2"
    ];
    mock = new MockProvider();
    wrapper = createLocalAccountsProvider(mock, accounts);
  });

  it("Should return the account addresses in eth_accounts", async () => {
    const response = await wrapper.send("eth_accounts");

    assert.equal(response[0], privateKeyToAddress(accounts[0]));
    assert.equal(response[1], privateKeyToAddress(accounts[1]));
  });

  it("Should return the account addresses in eth_requestAccounts", async () => {
    const response = await wrapper.send("eth_requestAccounts");
    assert.equal(response[0], privateKeyToAddress(accounts[0]));
    assert.equal(response[1], privateKeyToAddress(accounts[1]));
  });

  it("Should throw in eth_sign", async () => {
    await expectErrorAsync(
      () => wrapper.send("eth_sign"),
      "eth_sign is not supported yet"
    );
  });

  it("Should throw when calling sendTransaction without gas", async () => {
    const params = [
      {
        from: privateKeyToAddress(accounts[0]),
        to: "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d",
        gasPrice: 0x3b9aca00,
        nonce: 0x8,
        chainId: 123
      }
    ];

    await expectErrorAsync(
      () => wrapper.send("eth_sendTransaction", params),
      "Missing gas info"
    );
  });

  it("Should throw when calling sendTransaction without gasPrice", async () => {
    const params = [
      {
        from: privateKeyToAddress(accounts[0]),
        to: "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d",
        nonce: 0x8,
        chainId: 123,
        gas: 123
      }
    ];

    await expectErrorAsync(
      () => wrapper.send("eth_sendTransaction", params),
      "Missing gas info"
    );
  });

  it("Should, given two identical tx, return the same", async () => {
    const [rawTransaction] = await wrapper.send("eth_sendTransaction", [
      {
        from: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
        to: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
        gas: 21000,
        gasPrice: 678912,
        nonce: 0,
        chainId: 123,
        value: 1
      }
    ]);

    // This transaction was submitted to a blockchain it was accepted, so the
    // signature must be valid
    const expectedRaw =
      "0xf86480830a5c0082520894b5bc06d4548a3ac17d72b372ae1" +
      "e416bf65b8ead018082011aa0614471b82c6ffedd4722ca5faa7f9b309a923661a4b2" +
      "adc1a53a3ebe8c4d1f0aa06aebf2fbbe82703e5075965c65c776a9caeeff4b637f203" +
      "d65383e1ed2e22654";

    assert.equal(bufferToHex(rawTransaction), expectedRaw);
  });

  it("Should use the first account if from is missing", async () => {
    const [rawTransaction] = await wrapper.send("eth_sendTransaction", [
      {
        to: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
        gas: 21000,
        gasPrice: 678912,
        nonce: 0,
        chainId: 123,
        value: 1
      }
    ]);

    // See previous test
    const expectedRaw =
      "0xf86480830a5c0082520894b5bc06d4548a3ac17d72b372ae1" +
      "e416bf65b8ead018082011aa0614471b82c6ffedd4722ca5faa7f9b309a923661a4b2" +
      "adc1a53a3ebe8c4d1f0aa06aebf2fbbe82703e5075965c65c776a9caeeff4b637f203" +
      "d65383e1ed2e22654";

    assert.equal(bufferToHex(rawTransaction), expectedRaw);
  });

  it("Should throw if trying to send from an account that isn't local", async () => {
    try {
      await wrapper.send("eth_sendTransaction", [
        {
          from: "0x000006d4548a3ac17d72b372ae1e416bf65b8ead",
          to: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
          gas: 21000,
          gasPrice: 678912,
          nonce: 0,
          chainId: 123,
          value: 1
        }
      ]);
    } catch (err) {
      assert.isTrue(err.message.includes("isn't one of the local accounts"));
    }
  });

  it("Should throw if another chainId is used", async () => {
    try {
      await wrapper.send("eth_sendTransaction", [
        {
          from: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
          to: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
          gas: 21000,
          gasPrice: 678912,
          nonce: 0,
          chainId: 45678,
          value: 1
        }
      ]);
    } catch (err) {
      assert.equal(err.message, "chainIds don't match");
    }
  });

  it("Should forward other methods", async () => {
    const input = [1, 2];
    const params = await wrapper.send("eth_sarasa", input);

    assert.deepEqual(params, input);
  });

  it("Should get the nonce if not provided", async () => {
    await wrapper.send("eth_sendTransaction", [
      {
        from: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
        to: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
        gas: 21000,
        gasPrice: 678912,
        chainId: 123,
        value: 1
      }
    ]);

    assert.isDefined(mock.transactionsCountParams);
    assert.deepEqual(mock!.transactionsCountParams, [
      "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
      "pending"
    ]);
  });
});
