import Common from "@ethereumjs/common";
import { AccessListEIP2930Transaction } from "@ethereumjs/tx";
import { assert } from "chai";
import { bufferToHex, privateToAddress, toBuffer } from "ethereumjs-util";

import { ERRORS } from "../../../../src/internal/core/errors-list";
import { numberToRpcQuantity } from "../../../../src/internal/core/jsonrpc/types/base-types";
import {
  AutomaticSenderProvider,
  FixedSenderProvider,
  HDWalletProvider,
  JsonRpcTransactionData,
  LocalAccountsProvider,
} from "../../../../src/internal/core/providers/accounts";
import { InvalidArgumentsError } from "../../../../src/internal/core/providers/errors";
import { EIP1193Provider } from "../../../../src/types";
import {
  expectHardhatError,
  expectHardhatErrorAsync,
} from "../../../helpers/errors";

import { MockedProvider } from "./mocks";

function privateKeyToAddress(privateKey: string): string {
  return bufferToHex(privateToAddress(toBuffer(privateKey))).toLowerCase();
}

const MOCK_PROVIDER_CHAIN_ID = 123;

describe("Local accounts provider", () => {
  let mock: MockedProvider;
  let wrapper: EIP1193Provider;
  const accounts = [
    "0xb2e31025a2474b37e4c2d2931929a00b5752b98a3af45e3fd9a62ddc3cdf370e",
    "0x6d7229c1db5892730b84b4bc10543733b72cabf4cd3130d910faa8e459bb8eca",
    "0x6d4ec871d9b5469119bbfc891e958b6220d076a6849006098c370c8af5fc7776",
    "0xec02c2b7019e75378a05018adc30a0252ba705670acb383a1d332e57b0b792d2",
  ];

  beforeEach(() => {
    mock = new MockedProvider();
    mock.setReturnValue(
      "net_version",
      numberToRpcQuantity(MOCK_PROVIDER_CHAIN_ID)
    );
    mock.setReturnValue("eth_getTransactionCount", numberToRpcQuantity(0x8));
    mock.setReturnValue("eth_accounts", []);

    wrapper = new LocalAccountsProvider(mock, accounts);
  });

  it("Should return the account addresses in eth_accounts", async () => {
    const response = (await wrapper.request({
      method: "eth_accounts",
    })) as string[];

    assert.equal(response[0], privateKeyToAddress(accounts[0]));
    assert.equal(response[1], privateKeyToAddress(accounts[1]));
  });

  it("Should return the account addresses in eth_requestAccounts", async () => {
    const response = (await wrapper.request({
      method: "eth_requestAccounts",
    })) as string[];
    assert.equal(response[0], privateKeyToAddress(accounts[0]));
    assert.equal(response[1], privateKeyToAddress(accounts[1]));
  });

  it("Should throw when calling sendTransaction without gas", async () => {
    const params = [
      {
        from: privateKeyToAddress(accounts[0]),
        to: "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d",
        gasPrice: numberToRpcQuantity(0x3b9aca00),
        nonce: numberToRpcQuantity(0x8),
      },
    ];

    await expectHardhatErrorAsync(
      () => wrapper.request({ method: "eth_sendTransaction", params }),
      ERRORS.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY,
      "gas"
    );
  });

  it("Should throw when calling sendTransaction without gasPrice", async () => {
    const params = [
      {
        from: privateKeyToAddress(accounts[0]),
        to: "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d",
        nonce: numberToRpcQuantity(0x8),
        gas: numberToRpcQuantity(123),
      },
    ];

    await expectHardhatErrorAsync(
      () => wrapper.request({ method: "eth_sendTransaction", params }),
      ERRORS.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY,
      "gasPrice"
    );
  });

  it("Should, given two identical tx, return send the same raw transaction", async () => {
    await wrapper.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
          to: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
          gas: numberToRpcQuantity(21000),
          gasPrice: numberToRpcQuantity(678912),
          nonce: numberToRpcQuantity(0),
          value: numberToRpcQuantity(1),
        },
      ],
    });

    const rawTransaction = mock.getLatestParams("eth_sendRawTransaction")[0];

    // This transaction was submitted to a blockchain it was accepted, so the
    // signature must be valid
    const expectedRaw =
      "0xf86480830a5c0082520894b5bc06d4548a3ac17d72b372ae1" +
      "e416bf65b8ead018082011aa0614471b82c6ffedd4722ca5faa7f9b309a923661a4b2" +
      "adc1a53a3ebe8c4d1f0aa06aebf2fbbe82703e5075965c65c776a9caeeff4b637f203" +
      "d65383e1ed2e22654";

    assert.equal(rawTransaction, expectedRaw);
  });

  it("Should throw if trying to send from an account that isn't local", async () => {
    await expectHardhatErrorAsync(
      () =>
        wrapper.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: "0x000006d4548a3ac17d72b372ae1e416bf65b8ead",
              to: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
              gas: numberToRpcQuantity(21000),
              gasPrice: numberToRpcQuantity(678912),
              nonce: numberToRpcQuantity(0),
              value: numberToRpcQuantity(1),
            },
          ],
        }),
      ERRORS.NETWORK.NOT_LOCAL_ACCOUNT,
      "0x000006d4548a3ac17d72b372ae1e416bf65b8ead"
    );
  });

  it("Should forward other methods", async () => {
    const input = [1, 2];
    await wrapper.request({ method: "eth_sarasa", params: input });

    assert.deepEqual(mock.getLatestParams("eth_sarasa"), input);
  });

  it("Should get the nonce if not provided", async () => {
    await wrapper.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
          to: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
          gas: numberToRpcQuantity(21000),
          gasPrice: numberToRpcQuantity(678912),
          value: numberToRpcQuantity(1),
        },
      ],
    });

    assert.equal(mock.getNumberOfCalls("eth_getTransactionCount"), 1);
  });

  it("should send access list transactions", async () => {
    const tx = {
      from: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
      to: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
      gas: numberToRpcQuantity(30000),
      gasPrice: numberToRpcQuantity(1),
      nonce: numberToRpcQuantity(0),
      value: numberToRpcQuantity(1),
      chainId: numberToRpcQuantity(MOCK_PROVIDER_CHAIN_ID),
      accessList: [
        {
          address: "0x57d7ad4d3f0c74e3766874cf06fa1dc23c21f7e8",
          storageKeys: [
            "0xa50e92910457911e0e22d6dd1672f440a37b590b231d8309101255290f5394ec",
          ],
        },
      ],
    };
    await wrapper.request({
      method: "eth_sendTransaction",
      params: [tx],
    });

    const rawTransaction = mock.getLatestParams("eth_sendRawTransaction")[0];

    // this is a valid raw EIP_2930 tx
    // checked in a local hardhat node, where the sender account
    // had funds and the chain id was 123
    const expectedRaw =
      "0x01f89a7b800182753094b5bc06d4548a3ac17d72b372ae1e416bf65b8e" +
      "ad0180f838f79457d7ad4d3f0c74e3766874cf06fa1dc23c21f7e8e1a0a5" +
      "0e92910457911e0e22d6dd1672f440a37b590b231d8309101255290f5394" +
      "ec80a02b2fca5e2cf3569d29693e965f045529efa6a54bf0ab11104dd4ea" +
      "8b2ca3daf7a06025c30f36a179a09b9952e025632a65f220ec385eccd23a" +
      "1fb952976eace481";

    assert.equal(rawTransaction, expectedRaw);

    validateRawEIP2930Transaction(expectedRaw, tx);
  });

  it("should add the chainId value if it's missing", async () => {
    const tx = {
      from: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
      to: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
      gas: numberToRpcQuantity(30000),
      gasPrice: numberToRpcQuantity(1),
      nonce: numberToRpcQuantity(0),
      value: numberToRpcQuantity(1),
      accessList: [
        {
          address: "0x57d7ad4d3f0c74e3766874cf06fa1dc23c21f7e8",
          storageKeys: [
            "0xa50e92910457911e0e22d6dd1672f440a37b590b231d8309101255290f5394ec",
          ],
        },
      ],
    };
    await wrapper.request({
      method: "eth_sendTransaction",
      params: [tx],
    });

    const rawTransaction = mock.getLatestParams("eth_sendRawTransaction")[0];

    // see previous test
    const expectedRaw =
      "0x01f89a7b800182753094b5bc06d4548a3ac17d72b372ae1e416bf65b8e" +
      "ad0180f838f79457d7ad4d3f0c74e3766874cf06fa1dc23c21f7e8e1a0a5" +
      "0e92910457911e0e22d6dd1672f440a37b590b231d8309101255290f5394" +
      "ec80a02b2fca5e2cf3569d29693e965f045529efa6a54bf0ab11104dd4ea" +
      "8b2ca3daf7a06025c30f36a179a09b9952e025632a65f220ec385eccd23a" +
      "1fb952976eace481";

    assert.equal(rawTransaction, expectedRaw);

    validateRawEIP2930Transaction(expectedRaw, tx);
  });

  describe("eth_sign", () => {
    it("Should be compatible with parity's implementation", async () => {
      // This test was created by using Parity Ethereum
      // v2.2.5-beta-7fbcdfeed-20181213 and calling eth_sign

      const provider = new LocalAccountsProvider(mock, [
        "0x6e59a6617c48d76d3b21d722eaba867e16ecf54ab3da7a93724f51812bc6d1aa",
      ]);

      const result = await provider.request({
        method: "eth_sign",
        params: [
          "0x24f1a362780503D762060C1683864C4066A74b05",
          "0x41206d657373616765",
        ],
      });

      assert.equal(
        result,
        "0x25c349f668c90a890c84aa79a78cf6c74e96483b43ec3ed06aa8aec835477c034aa096e883cc9871aa4ffdffd9f21f6ee4aa4b70f478ad56a18971e4ec2c753e1b"
      );
    });

    it("Should be compatible with ganache-cli's implementation", async () => {
      // This test was created by using Ganache CLI v6.1.6 (ganache-core: 2.1.5)

      const provider = new LocalAccountsProvider(mock, [
        "0xf159c85082f4dd4ee472583a37a1b5683c727ec99708f3d94ff05faa7a7a70ce",
      ]);

      const result = (await provider.request({
        method: "eth_sign",
        params: [
          "0x0a929c90dd22f0fb09ec38983780530ee30a29a3",
          "0x41206d657373616765",
        ],
      })) as string;

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

      const provider = new LocalAccountsProvider(mock, [
        "0xf2d19e944851ea0faa9440e24a22ddab850210cae46b306a3fde4c98b22a0dcb",
      ]);

      const result = (await provider.request({
        method: "eth_sign",
        params: [
          "0x5Fd8509eABccFFec1d2530e48F55545B49Bd5B5e",
          "0x41206d657373616765",
        ],
      })) as string;

      assert.equal(
        result,
        "0x88c6ac158d40e84f519fbb48b6a1355a31202b684163f637fe5c92cc1109acbe5c79a2dd95a8aecff45756c6fc3b4fc8aef345179605bcead2916dd533fb22651b"
      );
    });

    it("Should throw if no data is given", async () => {
      await assert.isRejected(
        wrapper.request({
          method: "eth_sign",
          params: [privateKeyToAddress(accounts[0])],
        }),
        InvalidArgumentsError
      );
    });

    it("Should throw if the address isn't one of the local ones", async () => {
      await expectHardhatErrorAsync(
        () =>
          wrapper.request({
            method: "eth_sign",
            params: ["0x000006d4548a3ac17d72b372ae1e416bf65b8ead", "0x00"],
          }),
        ERRORS.NETWORK.NOT_LOCAL_ACCOUNT
      );
    });

    it("Should just forward if no address is given", async () => {
      await wrapper.request({ method: "eth_sign" });
      assert.deepEqual(mock.getLatestParams("eth_sign"), []);
    });
  });

  describe("eth_signTypedData", () => {
    // TODO: Test this. Note that it just forwards to/from eth-sign-util
  });
});

describe("hdwallet provider", () => {
  let mock: EIP1193Provider;
  let wrapper: EIP1193Provider;
  const mnemonic =
    "couch hunt wisdom giant regret supreme issue sing enroll ankle type husband";
  const hdpath = "m/44'/60'/0'/0/";

  beforeEach(() => {
    mock = new MockedProvider();
    wrapper = new HDWalletProvider(mock, mnemonic, hdpath);
  });

  it("should generate a valid address", async () => {
    const response = (await wrapper.request({
      method: "eth_accounts",
    })) as string[];
    assert.equal(response[0], "0x4f3e91d2cacd82fffd1f33a0d26d4078401986e9");
  });

  it("should generate a valid address when given a different index", async () => {
    wrapper = new HDWalletProvider(mock, mnemonic, hdpath, 1);
    const response = (await wrapper.request({
      method: "eth_accounts",
    })) as string[];
    assert.equal(response[0], "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d");
  });

  it("should generate 2 accounts", async () => {
    wrapper = new HDWalletProvider(mock, mnemonic, hdpath, 0, 2);
    const response = await wrapper.request({ method: "eth_accounts" });
    assert.deepEqual(response, [
      "0x4f3e91d2cacd82fffd1f33a0d26d4078401986e9",
      "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d",
    ]);
  });

  describe("HDPath formatting", () => {
    it("Should work if it doesn't end in a /", async () => {
      wrapper = new HDWalletProvider(mock, mnemonic, "m/44'/60'/0'/0");
      const response = (await wrapper.request({
        method: "eth_accounts",
      })) as string[];
      assert.equal(response[0], "0x4f3e91d2cacd82fffd1f33a0d26d4078401986e9");
    });

    it("Should throw if the path is invalid", () => {
      expectHardhatError(
        () => new HDWalletProvider(mock, mnemonic, ""),
        ERRORS.NETWORK.INVALID_HD_PATH
      );

      expectHardhatError(
        () => new HDWalletProvider(mock, mnemonic, "m/"),
        ERRORS.NETWORK.INVALID_HD_PATH
      );

      expectHardhatError(
        () => new HDWalletProvider(mock, mnemonic, "m//"),
        ERRORS.NETWORK.INVALID_HD_PATH
      );

      expectHardhatError(
        () => new HDWalletProvider(mock, mnemonic, "m/'"),
        ERRORS.NETWORK.INVALID_HD_PATH
      );

      expectHardhatError(
        () => new HDWalletProvider(mock, mnemonic, "m/0''"),
        ERRORS.NETWORK.INVALID_HD_PATH
      );

      expectHardhatError(
        () => new HDWalletProvider(mock, mnemonic, "ghj"),
        ERRORS.NETWORK.INVALID_HD_PATH
      );
    });
  });
});

describe("Sender providers", () => {
  let mock: MockedProvider;
  let wrapper: EIP1193Provider;
  let tx: JsonRpcTransactionData;
  beforeEach(() => {
    tx = {
      to: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
      gas: numberToRpcQuantity(21000),
      gasPrice: numberToRpcQuantity(678912),
      nonce: numberToRpcQuantity(0),
      value: numberToRpcQuantity(1),
    };

    mock = new MockedProvider();
    mock.setReturnValue("eth_accounts", [
      "0x123006d4548a3ac17d72b372ae1e416bf65b8eaf",
    ]);
  });

  describe("FixedSenderProvider", function () {
    beforeEach(function () {
      wrapper = new FixedSenderProvider(
        mock,
        "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d"
      );
    });

    it("Should set the from value into the transaction", async () => {
      await wrapper.request({ method: "eth_sendTransaction", params: [tx] });

      const params = mock.getLatestParams("eth_sendTransaction");

      assert.equal(
        params[0].from,
        "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d"
      );
    });

    it("Should not replace transaction's from", async () => {
      tx.from = "0x000006d4548a3ac17d72b372ae1e416bf65b8ead";
      await wrapper.request({ method: "eth_sendTransaction", params: [tx] });

      const params = mock.getLatestParams("eth_sendTransaction");

      assert.equal(
        params[0].from,
        "0x000006d4548a3ac17d72b372ae1e416bf65b8ead"
      );
    });
  });

  describe("AutomaticSenderProvider", function () {
    beforeEach(function () {
      wrapper = new AutomaticSenderProvider(mock);
    });

    it("Should use the first account if from is missing", async () => {
      await wrapper.request({ method: "eth_sendTransaction", params: [tx] });

      const params = mock.getLatestParams("eth_sendTransaction");
      assert.equal(
        params[0].from,
        "0x123006d4548a3ac17d72b372ae1e416bf65b8eaf"
      );
    });

    it("Should not fail on eth_calls if provider doesn't have any accounts", async () => {
      mock.setReturnValue("eth_accounts", []);

      tx.value = "asd";
      await wrapper.request({ method: "eth_call", params: [tx] });

      const params = mock.getLatestParams("eth_call");
      assert.equal(params[0].value, "asd");
    });

    it("Should not replace transaction's from", async () => {
      tx.from = "0x000006d4548a3ac17d72b372ae1e416bf65b8ead";
      await wrapper.request({ method: "eth_sendTransaction", params: [tx] });

      const params = mock.getLatestParams("eth_sendTransaction");

      assert.equal(
        params[0].from,
        "0x000006d4548a3ac17d72b372ae1e416bf65b8ead"
      );
    });
  });
});

/**
 * Validate that `rawTx` is an EIP-2930 transaction that has
 * the same values as `tx`
 */
function validateRawEIP2930Transaction(rawTx: string, tx: any) {
  const common = Common.forCustomChain(
    "mainnet",
    { chainId: MOCK_PROVIDER_CHAIN_ID },
    "berlin"
  );

  const sentTx = AccessListEIP2930Transaction.fromSerializedTx(
    toBuffer(rawTx),
    { common }
  );

  const accessList = sentTx.accessList.map(([address, storageKeys]) => {
    return {
      address: bufferToHex(address),
      storageKeys: storageKeys.map(bufferToHex),
    };
  });

  assert.equal(sentTx.getSenderAddress().toString(), tx.from);
  assert.equal(sentTx.to?.toString(), tx.to);

  assert.equal(numberToRpcQuantity(sentTx.gasLimit), tx.gas);
  assert.equal(numberToRpcQuantity(sentTx.gasPrice), tx.gasPrice);
  assert.equal(numberToRpcQuantity(sentTx.nonce), tx.nonce);
  assert.equal(numberToRpcQuantity(sentTx.value), tx.value);
  assert.deepEqual(accessList, tx.accessList);
}
