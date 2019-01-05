import { assert } from "chai";
import { bufferToHex, privateToAddress } from "ethereumjs-util";
import { Tx } from "web3x/eth";

import { ERRORS } from "../../../src/core/errors";
import {
  createHDWalletProvider,
  createLocalAccountsProvider,
  createSenderProvider
} from "../../../src/core/providers/accounts";
import { IEthereumProvider } from "../../../src/types";
import { wrapSend } from "../../../src/core/providers/wrapper";
import {
  expectBuidlerError,
  expectBuidlerErrorAsync,
  expectErrorAsync
} from "../../helpers/errors";

import { CountProvider } from "./mocks";

function privateKeyToAddress(privateKey: string): string {
  return bufferToHex(privateToAddress(privateKey)).toLowerCase();
}

describe("Local accounts provider", () => {
  let mock: CountProvider;
  let wrapper: IEthereumProvider;

  let accounts: string[] = [];

  beforeEach(() => {
    accounts = [
      "0xb2e31025a2474b37e4c2d2931929a00b5752b98a3af45e3fd9a62ddc3cdf370e",
      "0x6d7229c1db5892730b84b4bc10543733b72cabf4cd3130d910faa8e459bb8eca",
      "0x6d4ec871d9b5469119bbfc891e958b6220d076a6849006098c370c8af5fc7776",
      "0xec02c2b7019e75378a05018adc30a0252ba705670acb383a1d332e57b0b792d2"
    ];
    mock = new CountProvider();
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

    await expectBuidlerErrorAsync(
      () => wrapper.send("eth_sendTransaction", params),
      ERRORS.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY,
      "gas"
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

    await expectBuidlerErrorAsync(
      () => wrapper.send("eth_sendTransaction", params),
      ERRORS.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY,
      "gasPrice"
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

  it("Should throw if trying to send from an account that isn't local", async () => {
    await expectBuidlerErrorAsync(
      () =>
        wrapper.send("eth_sendTransaction", [
          {
            from: "0x000006d4548a3ac17d72b372ae1e416bf65b8ead",
            to: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
            gas: 21000,
            gasPrice: 678912,
            nonce: 0,
            chainId: 123,
            value: 1
          }
        ]),
      ERRORS.NETWORK.NOT_LOCAL_ACCOUNT,
      "0x000006d4548a3ac17d72b372ae1e416bf65b8ead"
    );
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

  describe("Describe eth_sign", () => {
    it("Should be compatible with parity's implementation", async () => {
      // This test was created by using Parity Ethereum
      // v2.2.5-beta-7fbcdfeed-20181213 and calling eth_sign

      const provider = createLocalAccountsProvider(new CountProvider(), [
        "0x6e59a6617c48d76d3b21d722eaba867e16ecf54ab3da7a93724f51812bc6d1aa"
      ]);

      const result = await provider.send("eth_sign", [
        "0x24f1a362780503D762060C1683864C4066A74b05",
        "0x41206d657373616765"
      ]);

      assert.equal(
        result,
        "0x25c349f668c90a890c84aa79a78cf6c74e96483b43ec3ed06aa8aec835477c034aa096e883cc9871aa4ffdffd9f21f6ee4aa4b70f478ad56a18971e4ec2c753e1b"
      );
    });

    it("Should be compatible with ganache-cli's implementation", async () => {
      // This test was created by using Ganache CLI v6.1.6 (ganache-core: 2.1.5)

      const provider = createLocalAccountsProvider(new CountProvider(), [
        "0xf159c85082f4dd4ee472583a37a1b5683c727ec99708f3d94ff05faa7a7a70ce"
      ]);

      const result = await provider.send("eth_sign", [
        "0x0a929c90dd22f0fb09ec38983780530ee30a29a3",
        "0x41206d657373616765"
      ]);

      // This test is weird because ganache encodes the v param of the signature
      // differently than the rest. It subtracts 27 from it before serializing.
      assert.equal(
        result.slice(0, -2),
        "0x84d993fc1b54926db1b6b81544aada29f0f36850a83dc979e8bacfa87e7c7cb11689b2f4ca64697842c42bb7e0cb02dff1851b42e25e62858f27f57bd00ff74b00".slice(
          0,
          -2
        )
      );
    });

    it("Should be compatible with geth's implementation", async () => {
      // This test was created by using Geth 1.8.20-stable

      const provider = createLocalAccountsProvider(new CountProvider(), [
        "0xf2d19e944851ea0faa9440e24a22ddab850210cae46b306a3fde4c98b22a0dcb"
      ]);

      const result = await provider.send("eth_sign", [
        "0x5Fd8509eABccFFec1d2530e48F55545B49Bd5B5e",
        "0x41206d657373616765"
      ]);

      assert.equal(
        result,
        "0x88c6ac158d40e84f519fbb48b6a1355a31202b684163f637fe5c92cc1109acbe5c79a2dd95a8aecff45756c6fc3b4fc8aef345179605bcead2916dd533fb22651b"
      );
    });

    it("Should throw if no data is given", async () => {
      await expectBuidlerErrorAsync(
        () => wrapper.send("eth_sign", [privateKeyToAddress(accounts[0])]),
        ERRORS.NETWORK.ETHSIGN_MISSING_DATA_PARAM
      );
    });

    it("Should throw if the address isn't one of the local ones", async () => {
      await expectBuidlerErrorAsync(
        () =>
          wrapper.send("eth_sign", [
            "0x000006d4548a3ac17d72b372ae1e416bf65b8ead",
            "0x00"
          ]),
        ERRORS.NETWORK.NOT_LOCAL_ACCOUNT
      );
    });

    it("Should just forward if no address is given", async () => {
      const params = await wrapper.send("eth_sign");
      assert.deepEqual(params, []);
    });
  });

  it("should throw if chain id is undefined", async () => {
    const params = [
      {
        from: privateKeyToAddress(accounts[0]),
        to: "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d",
        nonce: 0x8,
        chainId: undefined,
        gas: 123
      }
    ];

    await expectBuidlerErrorAsync(
      () => wrapper.send("eth_sendTransaction", params),
      ERRORS.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY,
      "chainId"
    );
  });
});

describe("hdwallet provider", () => {
  let mock: IEthereumProvider;
  let wrapper: IEthereumProvider;
  let mnemonic: string;
  let hdpath: string;

  beforeEach(() => {
    mnemonic =
      "couch hunt wisdom giant regret supreme issue sing enroll ankle type husband";
    hdpath = "m/44'/60'/0'/0/";
    mock = new CountProvider();
    wrapper = createHDWalletProvider(mock, mnemonic, hdpath);
  });

  it("should generate a valid address", async () => {
    const response = await wrapper.send("eth_accounts");
    assert.equal(response[0], "0x4f3e91d2cacd82fffd1f33a0d26d4078401986e9");
  });

  it("should generate a valid address when given a different index", async () => {
    wrapper = createHDWalletProvider(mock, mnemonic, hdpath, 1);
    const response = await wrapper.send("eth_accounts");
    assert.equal(response[0], "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d");
  });

  it("should generate 2 accounts", async () => {
    wrapper = createHDWalletProvider(mock, mnemonic, hdpath, 0, 2);
    const response = await wrapper.send("eth_accounts");
    assert.deepEqual(response, [
      "0x4f3e91d2cacd82fffd1f33a0d26d4078401986e9",
      "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d"
    ]);
  });

  describe("HDPath formatting", () => {
    it("Should work if it doesn't end in a /", async () => {
      wrapper = createHDWalletProvider(mock, mnemonic, "m/44'/60'/0'/0");
      const response = await wrapper.send("eth_accounts");
      assert.equal(response[0], "0x4f3e91d2cacd82fffd1f33a0d26d4078401986e9");
    });

    it("Should throw if the path is invalid", () => {
      expectBuidlerError(
        () => createHDWalletProvider(mock, mnemonic, ""),
        ERRORS.NETWORK.INVALID_HD_PATH
      );

      expectBuidlerError(
        () => createHDWalletProvider(mock, mnemonic, "m/"),
        ERRORS.NETWORK.INVALID_HD_PATH
      );

      expectBuidlerError(
        () => createHDWalletProvider(mock, mnemonic, "m//"),
        ERRORS.NETWORK.INVALID_HD_PATH
      );

      expectBuidlerError(
        () => createHDWalletProvider(mock, mnemonic, "m/'"),
        ERRORS.NETWORK.INVALID_HD_PATH
      );

      expectBuidlerError(
        () => createHDWalletProvider(mock, mnemonic, "m/0''"),
        ERRORS.NETWORK.INVALID_HD_PATH
      );

      expectBuidlerError(
        () => createHDWalletProvider(mock, mnemonic, "ghj"),
        ERRORS.NETWORK.INVALID_HD_PATH
      );
    });
  });
});

describe("Account provider", () => {
  let mock: IEthereumProvider;
  let provider: IEthereumProvider;
  let wrapper: IEthereumProvider;
  let tx: Tx;
  beforeEach(() => {
    tx = {
      to: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
      gas: 21000,
      gasPrice: 678912,
      nonce: 0,
      value: 1
    };
    mock = new CountProvider();
    provider = wrapSend(mock, async (method, params) => {
      if (method === "eth_accounts") {
        return ["0x2a97a65d5673a2c61e95ce33cecadf24f654f96d"];
      }
      return mock.send(method, params);
    });
    wrapper = createSenderProvider(
      provider,
      "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d"
    );
  });

  it("Should set the from value into the transaction", async () => {
    const response = await wrapper.send("eth_sendTransaction", [tx]);
    assert.equal(
      response[0].from,
      "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d"
    );
  });

  it("Should not replace transaction's from", async () => {
    tx.from = "0x000006d4548a3ac17d72b372ae1e416bf65b8ead";
    const response = await wrapper.send("eth_sendTransaction", [tx]);
    assert.equal(
      response[0].from,
      "0x000006d4548a3ac17d72b372ae1e416bf65b8ead"
    );
  });

  it("Should use the first account if from is missing", async () => {
    wrapper = createSenderProvider(provider);
    tx.from = "0x000006d4548a3ac17d72b372ae1e416bf65b8ead";
    const response = await wrapper.send("eth_sendTransaction", [tx]);
    assert.equal(
      response[0].from,
      "0x000006d4548a3ac17d72b372ae1e416bf65b8ead"
    );
  });

  it("Should not fail if provider doesn't have any accounts", async () => {
    tx.value = "asd";
    wrapper = createSenderProvider(mock);
    const response = await wrapper.send("eth_call", [tx]);
    assert.equal(response[0].value, "asd");
  });
});
