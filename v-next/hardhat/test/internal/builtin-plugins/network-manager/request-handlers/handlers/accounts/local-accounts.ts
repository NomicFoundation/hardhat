import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejects,
  assertRejectsWithHardhatError,
} from "@nomicfoundation/hardhat-test-utils";
import {
  hexStringToBytes,
  numberToHexString,
} from "@nomicfoundation/hardhat-utils/hex";
import { addr } from "micro-eth-signer";

import { getJsonRpcRequest } from "../../../../../../../src/internal/builtin-plugins/network-manager/json-rpc.js";
import { LocalAccountsHandler } from "../../../../../../../src/internal/builtin-plugins/network-manager/request-handlers/handlers/accounts/local-accounts.js";
import { EthereumMockedProvider } from "../../ethereum-mocked-provider.js";

// This is a valid raw EIP_2930 tx checked in a local hardhat node,
// where the sender account had funds and the chain id was 123.
const EXPECTED_RAW_TX =
  "0x01f89a7b800182753094b5bc06d4548a3ac17d72b372ae1e416bf65b8e" +
  "ad0180f838f79457d7ad4d3f0c74e3766874cf06fa1dc23c21f7e8e1a0a5" +
  "0e92910457911e0e22d6dd1672f440a37b590b231d8309101255290f5394" +
  "ec80a02b2fca5e2cf3569d29693e965f045529efa6a54bf0ab11104dd4ea" +
  "8b2ca3daf7a06025c30f36a179a09b9952e025632a65f220ec385eccd23a" +
  "1fb952976eace481";

const EXPECTED_RAW_TX_VALUES = {
  from: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
  to: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
  gas: "0x7530",
  gasLimit: "0x7530",
  gasPrice: "0x1",
  nonce: "0x0",
  value: "0x1",
  accessList: [
    {
      address: "0x57d7ad4d3f0c74e3766874cf06fa1dc23c21f7e8",
      storageKeys: [
        "0xa50e92910457911e0e22d6dd1672f440a37b590b231d8309101255290f5394ec",
      ],
    },
  ],
};

/**
 * Validate that `rawTx` is an EIP-2930 transaction that has
 * the same values as `tx`
 */
function validateRawEIP2930Transaction(tx: any) {
  assert.equal(EXPECTED_RAW_TX_VALUES.from, tx.from);
  assert.equal(EXPECTED_RAW_TX_VALUES.to, tx.to);

  assert.equal(EXPECTED_RAW_TX_VALUES.gas, tx.gas);
  assert.equal(EXPECTED_RAW_TX_VALUES.gasPrice, tx.gasPrice);
  assert.equal(EXPECTED_RAW_TX_VALUES.nonce, tx.nonce);
  assert.equal(EXPECTED_RAW_TX_VALUES.value, tx.value);
  assert.deepEqual(EXPECTED_RAW_TX_VALUES.accessList, tx.accessList);
}

const MOCK_PROVIDER_CHAIN_ID = 123;

describe("LocalAccountsHandler", () => {
  let localAccountsHandler: LocalAccountsHandler;

  let mockedProvider: EthereumMockedProvider;

  const accounts = [
    "0xb2e31025a2474b37e4c2d2931929a00b5752b98a3af45e3fd9a62ddc3cdf370e",
    "0x6d7229c1db5892730b84b4bc10543733b72cabf4cd3130d910faa8e459bb8eca",
    "0x6d4ec871d9b5469119bbfc891e958b6220d076a6849006098c370c8af5fc7776",
    "0xec02c2b7019e75378a05018adc30a0252ba705670acb383a1d332e57b0b792d2",
  ];

  beforeEach(() => {
    mockedProvider = new EthereumMockedProvider();

    mockedProvider.setReturnValue(
      "net_version",
      numberToHexString(MOCK_PROVIDER_CHAIN_ID),
    );
    mockedProvider.setReturnValue(
      "eth_getTransactionCount",
      numberToHexString(0x8),
    );
    mockedProvider.setReturnValue("eth_accounts", []);

    localAccountsHandler = new LocalAccountsHandler(mockedProvider, accounts);
  });

  describe("resolveRequest", () => {
    it("should return the account addresses in eth_accounts", async () => {
      const jsonRpcRequest = getJsonRpcRequest(1, "eth_accounts");

      const res = await localAccountsHandler.handle(jsonRpcRequest);

      assert.ok(res !== null, "res should not be null");
      assert.ok("result" in res, "res should have the property 'result'");
      assert.ok(Array.isArray(res.result), "res.result should be an array");

      assert.equal(
        res.result[0],
        addr.fromPrivateKey(accounts[0]).toLowerCase(),
      );
      assert.equal(
        res.result[1],
        addr.fromPrivateKey(accounts[1]).toLowerCase(),
      );
    });

    it("should return the account addresses in eth_requestAccounts", async () => {
      const jsonRpcRequest = getJsonRpcRequest(1, "eth_requestAccounts");

      const res = await localAccountsHandler.handle(jsonRpcRequest);

      assert.ok(res !== null, "res should not be null");
      assert.ok("result" in res, "res should have the property 'result'");
      assert.ok(Array.isArray(res.result), "res.result should be an array");

      assert.equal(
        res.result[0],
        addr.fromPrivateKey(accounts[0]).toLowerCase(),
      );
      assert.equal(
        res.result[1],
        addr.fromPrivateKey(accounts[1]).toLowerCase(),
      );
    });

    it("should forward other methods", async () => {
      const input = [1, 2];
      const jsonRpcRequest = getJsonRpcRequest(1, "eth_sarasa", input);

      const res = await localAccountsHandler.handle(jsonRpcRequest);

      assert.deepEqual(res, jsonRpcRequest);
    });

    describe("eth_sign", () => {
      it("should be compatible with parity's implementation", async () => {
        // This test was created by using Parity Ethereum
        // v2.2.5-beta-7fbcdfeed-20181213 and calling eth_sign
        localAccountsHandler = new LocalAccountsHandler(mockedProvider, [
          "0x6e59a6617c48d76d3b21d722eaba867e16ecf54ab3da7a93724f51812bc6d1aa",
        ]);

        const jsonRpcRequest = getJsonRpcRequest(1, "eth_sign", [
          "0x24f1a362780503D762060C1683864C4066A74b05",
          "0x41206d657373616765",
        ]);

        const res = await localAccountsHandler.handle(jsonRpcRequest);

        assert.ok(res !== null, "res should not be null");
        assert.ok("result" in res, "res should have the property 'result'");

        assert.equal(
          res.result,
          "0x25c349f668c90a890c84aa79a78cf6c74e96483b43ec3ed06aa8aec835477c034aa096e883cc9871aa4ffdffd9f21f6ee4aa4b70f478ad56a18971e4ec2c753e1b",
        );
      });

      it("should be compatible with ganache-cli's implementation", async () => {
        // This test was created by using Ganache CLI v6.1.6 (ganache-core: 2.1.5)
        localAccountsHandler = new LocalAccountsHandler(mockedProvider, [
          "0xf159c85082f4dd4ee472583a37a1b5683c727ec99708f3d94ff05faa7a7a70ce",
        ]);

        const jsonRpcRequest = getJsonRpcRequest(1, "eth_sign", [
          "0x0a929c90dd22f0fb09ec38983780530ee30a29a3",
          "0x41206d657373616765",
        ]);

        const res = await localAccountsHandler.handle(jsonRpcRequest);

        assert.ok(res !== null, "res should not be null");
        assert.ok("result" in res, "res should have the property 'result'");
        assert.ok(
          typeof res.result === "string",
          "res.result should be a string",
        );

        // This test is weird because ganache encodes the v param of the signature
        // differently than the rest. It subtracts 27 from it before serializing.
        assert.equal(
          res.result.slice(0, -2),
          "0x84d993fc1b54926db1b6b81544aada29f0f36850a83dc979e8bacfa87e7c7cb11689b2f4ca64697842c42bb7e0cb02dff1851b42e25e62858f27f57bd00ff74b00".slice(
            0,
            -2,
          ),
        );
      });

      it("should be compatible with geth's implementation", async () => {
        // This test was created by using Geth 1.8.20-stable
        localAccountsHandler = new LocalAccountsHandler(mockedProvider, [
          "0xf2d19e944851ea0faa9440e24a22ddab850210cae46b306a3fde4c98b22a0dcb",
        ]);

        const jsonRpcRequest = getJsonRpcRequest(1, "eth_sign", [
          "0x5Fd8509eABccFFec1d2530e48F55545B49Bd5B5e",
          "0x41206d657373616765",
        ]);

        const res = await localAccountsHandler.handle(jsonRpcRequest);

        assert.ok(res !== null, "res should not be null");
        assert.ok("result" in res, "res should have the property 'result'");

        assert.equal(
          res.result,
          "0x88c6ac158d40e84f519fbb48b6a1355a31202b684163f637fe5c92cc1109acbe5c79a2dd95a8aecff45756c6fc3b4fc8aef345179605bcead2916dd533fb22651b",
        );
      });

      it("should throw if no data is given", async () => {
        const jsonRpcRequest = getJsonRpcRequest(1, "eth_sign", [
          addr.fromPrivateKey(accounts[0]),
        ]);

        assertRejects(localAccountsHandler.handle(jsonRpcRequest));
      });

      it("should throw if the address isn't one of the local ones", async () => {
        const jsonRpcRequest = getJsonRpcRequest(1, "eth_sign", [
          "0x000006d4548a3ac17d72b372ae1e416bf65b8ead",
          "0x00",
        ]);

        await assertRejectsWithHardhatError(
          () => localAccountsHandler.handle(jsonRpcRequest),
          HardhatError.ERRORS.NETWORK.NOT_LOCAL_ACCOUNT,
          {
            account: "0x000006d4548a3ac17d72b372ae1e416bf65b8ead",
          },
        );
      });

      it("should just forward if no address is given", async () => {
        const jsonRpcRequest = getJsonRpcRequest(1, "eth_sign");

        const res = await localAccountsHandler.handle(jsonRpcRequest);

        assert.deepEqual(res, jsonRpcRequest);
      });
    });

    describe("eth_signTypedData_v4", () => {
      it("should be compatible with EIP-712 example", async () => {
        // This test was taken from the `eth_signTypedData` example from the
        // EIP-712 specification.
        // <https://eips.ethereum.org/EIPS/eip-712#eth_signtypeddata>
        localAccountsHandler = new LocalAccountsHandler(mockedProvider, [
          // keccak256("cow")
          "0xc85ef7d79691fe79573b1a7064c19c1a9819ebdbd1faaab1a8ec92344438aaf4",
        ]);

        const jsonRpcRequest = getJsonRpcRequest(1, "eth_signTypedData_v4", [
          "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
          {
            types: {
              EIP712Domain: [
                { name: "name", type: "string" },
                { name: "version", type: "string" },
                { name: "chainId", type: "uint256" },
                { name: "verifyingContract", type: "address" },
              ],
              Person: [
                { name: "name", type: "string" },
                { name: "wallet", type: "address" },
              ],
              Mail: [
                { name: "from", type: "Person" },
                { name: "to", type: "Person" },
                { name: "contents", type: "string" },
              ],
            },
            primaryType: "Mail",
            domain: {
              name: "Ether Mail",
              version: "1",
              chainId: 1,
              verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
            },
            message: {
              from: {
                name: "Cow",
                wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
              },
              to: {
                name: "Bob",
                wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
              },
              contents: "Hello, Bob!",
            },
          },
        ]);

        const res = await localAccountsHandler.handle(jsonRpcRequest);

        assert.ok(res !== null, "res should not be null");
        assert.ok("result" in res, "res should have the property 'result'");

        assert.equal(
          res.result,
          "0x4355c47d63924e8a72e509b65029052eb6c299d53a04e167c5775fd466751c9d07299936d304c153f6443dfa05f40ff007d72911b6f72307f996231605b915621c",
        );
      });

      it("should be compatible with stringified JSON input", async () => {
        localAccountsHandler = new LocalAccountsHandler(mockedProvider, [
          // keccak256("cow")
          "0xc85ef7d79691fe79573b1a7064c19c1a9819ebdbd1faaab1a8ec92344438aaf4",
        ]);

        const jsonRpcRequest = getJsonRpcRequest(1, "eth_signTypedData_v4", [
          "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
          JSON.stringify({
            types: {
              EIP712Domain: [
                { name: "name", type: "string" },
                { name: "version", type: "string" },
                { name: "chainId", type: "uint256" },
                { name: "verifyingContract", type: "address" },
              ],
              Person: [
                { name: "name", type: "string" },
                { name: "wallet", type: "address" },
              ],
              Mail: [
                { name: "from", type: "Person" },
                { name: "to", type: "Person" },
                { name: "contents", type: "string" },
              ],
            },
            primaryType: "Mail",
            domain: {
              name: "Ether Mail",
              version: "1",
              chainId: 1,
              verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
            },
            message: {
              from: {
                name: "Cow",
                wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
              },
              to: {
                name: "Bob",
                wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
              },
              contents: "Hello, Bob!",
            },
          }),
        ]);

        const res = await localAccountsHandler.handle(jsonRpcRequest);

        assert.ok(res !== null, "res should not be null");
        assert.ok("result" in res, "res should have the property 'result'");

        assert.equal(
          res.result,
          "0x4355c47d63924e8a72e509b65029052eb6c299d53a04e167c5775fd466751c9d07299936d304c153f6443dfa05f40ff007d72911b6f72307f996231605b915621c",
        );
      });

      it("should throw if data string input is not JSON", async () => {
        const jsonRpcRequest = getJsonRpcRequest(1, "eth_signTypedData_v4", [
          "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
          "}thisisnotvalidjson{",
        ]);

        await assertRejectsWithHardhatError(
          () => localAccountsHandler.handle(jsonRpcRequest),
          HardhatError.ERRORS.NETWORK.ETHSIGN_TYPED_DATA_V4_INVALID_DATA_PARAM,
          {},
        );
      });

      it("should throw if no data is given", async () => {
        const jsonRpcRequest = getJsonRpcRequest(1, "eth_signTypedData_v4", [
          addr.fromPrivateKey(accounts[0]),
        ]);

        await assertRejectsWithHardhatError(
          () => localAccountsHandler.handle(jsonRpcRequest),
          HardhatError.ERRORS.NETWORK.ETHSIGN_MISSING_DATA_PARAM,
          {},
        );
      });

      it("should just forward if the address isn't one of the local ones", async () => {
        const jsonRpcRequest = getJsonRpcRequest(1, "eth_signTypedData_v4", [
          "0x000006d4548a3ac17d72b372ae1e416bf65b8ead",
          {},
        ]);

        const res = await localAccountsHandler.handle(jsonRpcRequest);

        assert.deepEqual(res, jsonRpcRequest);
      });
    });

    describe("personal_sign", () => {
      it("should be compatible with geth's implementation", async () => {
        // This test was created by using Geth 1.10.12-unstable and calling personal_sign
        localAccountsHandler = new LocalAccountsHandler(mockedProvider, [
          "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        ]);

        const jsonRpcRequest = getJsonRpcRequest(1, "personal_sign", [
          "0x5417aa2a18a44da0675524453ff108c545382f0d7e26605c56bba47c21b5e979",
          "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
        ]);

        const res = await localAccountsHandler.handle(jsonRpcRequest);

        assert.ok(res !== null, "res should not be null");
        assert.ok("result" in res, "res should have the property 'result'");

        assert.equal(
          res.result,
          "0x9c73dd4937a37eecab3abb54b74b6ec8e500080431d36afedb1726624587ee6710296e10c1194dded7376f13ff03ef6c9e797eb86bae16c20c57776fc69344271c",
        );
      });

      it("should be compatible with metamask's implementation", async () => {
        // This test was created by using Metamask 10.3.0
        localAccountsHandler = new LocalAccountsHandler(mockedProvider, [
          "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        ]);

        const jsonRpcRequest = getJsonRpcRequest(1, "personal_sign", [
          "0x7699f568ecd7753e6ddf75a42fa4c2cc86cbbdc704c9eb1a6b6d4b9d8b8d1519",
          "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
        ]);

        const res = await localAccountsHandler.handle(jsonRpcRequest);

        assert.ok(res !== null, "res should not be null");
        assert.ok("result" in res, "res should have the property 'result'");

        assert.equal(
          res.result,
          "0x2875e4206c9fe3b229291c81f95cc4f421e2f4d3e023f5b4041daa56ab4000977010b47a3c01036ec8a6a0872aec2ab285150f003d01b0d8da60c1cceb9154181c",
        );
      });
    });
  });

  describe("modifyRequest", () => {
    describe("sending transactions to the null address", () => {
      const testCases = [null, undefined];

      for (const testCase of testCases) {
        it(`should succeed when the data field is not empty and the "to" field is ${testCase}`, async () => {
          const tx = {
            to: testCase,
            from: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
            gas: numberToHexString(30000),
            nonce: numberToHexString(0),
            value: numberToHexString(1),
            chainId: numberToHexString(MOCK_PROVIDER_CHAIN_ID),
            maxFeePerGas: numberToHexString(12),
            maxPriorityFeePerGas: numberToHexString(2),
            data: "0x01",
          };

          const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [
            tx,
          ]);

          await localAccountsHandler.handle(jsonRpcRequest);

          assert.ok(
            Array.isArray(jsonRpcRequest.params),
            "params should be an array",
          );

          const rawTransaction = hexStringToBytes(jsonRpcRequest.params[0]);
          // The tx type is encoded in the first byte, and it must be the EIP-1559 one
          assert.equal(rawTransaction[0], 2);
        });

        it(`should throw when the data field is undefined and the "to" field is ${testCase}`, async () => {
          const tx = {
            to: testCase,
            // In this test scenario, the "data" field is omitted
            from: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
            gas: numberToHexString(30000),
            nonce: numberToHexString(0),
            value: numberToHexString(1),
            chainId: numberToHexString(MOCK_PROVIDER_CHAIN_ID),
            maxFeePerGas: numberToHexString(12),
            maxPriorityFeePerGas: numberToHexString(2),
          };

          const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [
            tx,
          ]);

          assertRejectsWithHardhatError(
            () => localAccountsHandler.handle(jsonRpcRequest),
            HardhatError.ERRORS.NETWORK
              .DATA_FIELD_CANNOT_BE_NULL_WITH_NULL_ADDRESS,
            {},
          );
        });
      }
    });

    it("should, given two identical tx, return the same raw transaction", async () => {
      const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [
        {
          from: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
          to: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
          gas: numberToHexString(21000),
          gasPrice: numberToHexString(678912),
          nonce: numberToHexString(0),
          value: numberToHexString(1),
        },
      ]);

      await localAccountsHandler.handle(jsonRpcRequest);

      // This transaction was submitted to a blockchain and accepted, so the signature must be valid
      const expectedRaw =
        "0xf86480830a5c0082520894b5bc06d4548a3ac17d72b372ae1" +
        "e416bf65b8ead018082011aa0614471b82c6ffedd4722ca5faa7f9b309a923661a4b2" +
        "adc1a53a3ebe8c4d1f0aa06aebf2fbbe82703e5075965c65c776a9caeeff4b637f203" +
        "d65383e1ed2e22654";

      assert.deepEqual(jsonRpcRequest, {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_sendRawTransaction",
        params: [expectedRaw],
      });
    });

    it("should send eip1559 txs if the eip1559 fields are present", async () => {
      const tx = {
        from: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
        to: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
        gas: numberToHexString(30000),
        nonce: numberToHexString(0),
        value: numberToHexString(1),
        chainId: numberToHexString(MOCK_PROVIDER_CHAIN_ID),
        maxFeePerGas: numberToHexString(12),
        maxPriorityFeePerGas: numberToHexString(2),
      };

      const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [tx]);

      await localAccountsHandler.handle(jsonRpcRequest);

      assert.ok(
        Array.isArray(jsonRpcRequest.params),
        "params should be an array",
      );

      const rawTransaction = hexStringToBytes(jsonRpcRequest.params[0]);

      // The tx type is encoded in the first byte, and it must be the EIP-1559 one
      assert.equal(rawTransaction[0], 2);
    });

    it("should send access list transactions", async () => {
      const tx = {
        from: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
        to: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
        gas: numberToHexString(30000),
        gasPrice: numberToHexString(1),
        nonce: numberToHexString(0),
        value: numberToHexString(1),
        chainId: numberToHexString(MOCK_PROVIDER_CHAIN_ID),
        accessList: [
          {
            address: "0x57d7ad4d3f0c74e3766874cf06fa1dc23c21f7e8",
            storageKeys: [
              "0xa50e92910457911e0e22d6dd1672f440a37b590b231d8309101255290f5394ec",
            ],
          },
        ],
      };

      const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [tx]);

      await localAccountsHandler.handle(jsonRpcRequest);

      assert.ok(
        Array.isArray(jsonRpcRequest.params),
        "params should be an array",
      );

      const rawTransaction = jsonRpcRequest.params[0];

      assert.equal(rawTransaction, EXPECTED_RAW_TX);

      validateRawEIP2930Transaction(tx);
    });

    it("should add the chainId value if it's missing", async () => {
      const tx = {
        from: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
        to: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
        gas: numberToHexString(30000),
        gasPrice: numberToHexString(1),
        nonce: numberToHexString(0),
        value: numberToHexString(1),
        accessList: [
          {
            address: "0x57d7ad4d3f0c74e3766874cf06fa1dc23c21f7e8",
            storageKeys: [
              "0xa50e92910457911e0e22d6dd1672f440a37b590b231d8309101255290f5394ec",
            ],
          },
        ],
      };

      const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [tx]);

      await localAccountsHandler.handle(jsonRpcRequest);

      assert.ok(
        Array.isArray(jsonRpcRequest.params),
        "params should be an array",
      );

      const rawTransaction = jsonRpcRequest.params[0];

      assert.equal(rawTransaction, EXPECTED_RAW_TX);

      validateRawEIP2930Transaction(tx);
    });

    it("should get the nonce if not provided", async () => {
      const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [
        {
          from: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
          to: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
          gas: numberToHexString(21000),
          gasPrice: numberToHexString(678912),
          value: numberToHexString(1),
        },
      ]);

      await localAccountsHandler.handle(jsonRpcRequest);

      assert.equal(
        mockedProvider.getNumberOfCalls("eth_getTransactionCount"),
        1,
      );
    });

    it("should throw when calling sendTransaction without gas", async () => {
      const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [
        {
          from: addr.fromPrivateKey(accounts[0]),
          to: "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d",
          gasPrice: numberToHexString(0x3b9aca00),
          nonce: numberToHexString(0x8),
        },
      ]);

      await assertRejectsWithHardhatError(
        () => localAccountsHandler.handle(jsonRpcRequest),
        HardhatError.ERRORS.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY,
        { param: "gas" },
      );
    });

    it("should throw when calling sendTransaction without gasPrice, maxFeePerGas and maxPriorityFeePerGas", async () => {
      const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [
        {
          from: addr.fromPrivateKey(accounts[0]),
          to: "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d",
          nonce: numberToHexString(0x8),
          gas: numberToHexString(123),
        },
      ]);

      await assertRejectsWithHardhatError(
        () => localAccountsHandler.handle(jsonRpcRequest),
        HardhatError.ERRORS.NETWORK.MISSING_FEE_PRICE_FIELDS,
        {},
      );
    });

    it("should throw when calling sendTransaction with gasPrice and EIP1559 fields", async () => {
      const jsonRpcRequest1 = getJsonRpcRequest(1, "eth_sendTransaction", [
        {
          from: addr.fromPrivateKey(accounts[0]),
          to: "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d",
          nonce: numberToHexString(0x8),
          gas: numberToHexString(123),
          gasPrice: numberToHexString(1),
          maxFeePerGas: numberToHexString(1),
        },
      ]);

      const jsonRpcRequest2 = getJsonRpcRequest(1, "eth_sendTransaction", [
        {
          from: addr.fromPrivateKey(accounts[0]),
          to: "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d",
          nonce: numberToHexString(0x8),
          gas: numberToHexString(123),
          gasPrice: numberToHexString(1),
          maxPriorityFeePerGas: numberToHexString(1),
        },
      ]);

      await assertRejectsWithHardhatError(
        () => localAccountsHandler.handle(jsonRpcRequest1),
        HardhatError.ERRORS.NETWORK.INCOMPATIBLE_FEE_PRICE_FIELDS,
        {},
      );

      await assertRejectsWithHardhatError(
        () => localAccountsHandler.handle(jsonRpcRequest2),
        HardhatError.ERRORS.NETWORK.INCOMPATIBLE_FEE_PRICE_FIELDS,
        {},
      );
    });

    it("should throw when only one EIP1559 field is provided", async () => {
      const jsonRpcRequest1 = getJsonRpcRequest(1, "eth_sendTransaction", [
        {
          from: addr.fromPrivateKey(accounts[0]),
          to: "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d",
          nonce: numberToHexString(0x8),
          gas: numberToHexString(123),
          maxFeePerGas: numberToHexString(1),
        },
      ]);

      const jsonRpcRequest2 = getJsonRpcRequest(1, "eth_sendTransaction", [
        {
          from: addr.fromPrivateKey(accounts[0]),
          to: "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d",
          nonce: numberToHexString(0x8),
          gas: numberToHexString(123),
          maxPriorityFeePerGas: numberToHexString(1),
        },
      ]);

      await assertRejectsWithHardhatError(
        () => localAccountsHandler.handle(jsonRpcRequest1),
        HardhatError.ERRORS.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY,
        { param: "maxPriorityFeePerGas" },
      );

      await assertRejectsWithHardhatError(
        () => localAccountsHandler.handle(jsonRpcRequest2),
        HardhatError.ERRORS.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY,
        { param: "maxFeePerGas" },
      );
    });

    it("should throw if trying to send from an account that isn't local", async () => {
      const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [
        {
          from: "0x000006d4548a3ac17d72b372ae1e416bf65b8ead",
          to: "0xb5bc06d4548a3ac17d72b372ae1e416bf65b8ead",
          gas: numberToHexString(21000),
          gasPrice: numberToHexString(678912),
          nonce: numberToHexString(0),
          value: numberToHexString(1),
        },
      ]);

      await assertRejectsWithHardhatError(
        () => localAccountsHandler.handle(jsonRpcRequest),
        HardhatError.ERRORS.NETWORK.NOT_LOCAL_ACCOUNT,
        { account: "0x000006d4548a3ac17d72b372ae1e416bf65b8ead" },
      );
    });

    it("should not modify the json rpc request for other methods", async () => {
      const input = [1, 2];
      const originalJsonRpcRequest = getJsonRpcRequest(1, "eth_sarasa", input);

      const jsonRpcRequest = { ...originalJsonRpcRequest };

      await localAccountsHandler.handle(jsonRpcRequest);

      assert.deepEqual(jsonRpcRequest, originalJsonRpcRequest);
    });

    it("should not modify the json rpc request if no address is given", async () => {
      const originalJsonRpcRequest = getJsonRpcRequest(1, "eth_sign");

      const jsonRpcRequest = { ...originalJsonRpcRequest };

      await localAccountsHandler.handle(jsonRpcRequest);

      assert.deepEqual(jsonRpcRequest, originalJsonRpcRequest);
    });

    it("should not modify the json rpc request if the address isn't one of the local ones", async () => {
      const originalJsonRpcRequest = getJsonRpcRequest(
        1,
        "eth_signTypedData_v4",
        ["0x000006d4548a3ac17d72b372ae1e416bf65b8ead", {}],
      );

      const jsonRpcRequest = { ...originalJsonRpcRequest };

      await localAccountsHandler.handle(jsonRpcRequest);

      assert.deepEqual(jsonRpcRequest, originalJsonRpcRequest);
    });
  });
});
