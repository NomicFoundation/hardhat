import type Eth from "@ledgerhq/hw-app-eth";

import assert from "node:assert/strict";
import path from "node:path";
import { after, before, beforeEach, describe, it } from "node:test";

import {
  DisconnectedDevice,
  DisconnectedDeviceDuringOperation,
  LockedDeviceError,
  TransportStatusError,
} from "@ledgerhq/errors";
import { TransportError } from "@ledgerhq/hw-transport";
import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import {
  assertRejects,
  assertRejectsWithHardhatError,
  assertThrowsHardhatError,
} from "@nomicfoundation/hardhat-test-utils";
import {
  readJsonFile,
  remove,
  writeJsonFile,
} from "@nomicfoundation/hardhat-utils/fs";
import { numberToHexString } from "@nomicfoundation/hardhat-utils/hex";

import { LedgerHandler } from "../../src/internal/handler.js";
import { createJsonRpcRequest } from "../helpers/create-json-rpc-request.js";
import { mockedDisplayInfo } from "../helpers/display-info-mock.js";
import { getEthMocked, type MethodsConfig } from "../helpers/eth-mocked.js";
import { EthereumMockedProvider } from "../helpers/ethereum-provider-mock.js";
import {
  getTransportNodeHidMock,
  type TransportMockState,
} from "../helpers/transport-node-hid-mock.js";

// Status code 0x6511 is thrown when the Ethereum app is not open on the Ledger device
const APP_NOT_OPEN_STATUS_CODE = 0x6511;

const LEDGER_ADDRESSES = [
  "0xa809931e3b38059adae9bc5455bc567d0509ab92",
  "0xda6a52afdae5ff66aa786da68754a227331f56e3",
  "0xbc307688a80ec5ed0edc1279c44c1b34f7746bda",
];

const tmpCachePath = path.join(
  process.cwd(),
  "test",
  "fixture-projects",
  "tmp-cache.json",
);

const derPath = "m/44'/60'/1'/0/0";
const account = {
  address: LEDGER_ADDRESSES[1],
  publicKey: "0x1",
};
const dataToSign =
  "0x5417aa2a18a44da0675524453ff108c545382f0d7e26605c56bba47c21b5e979";
const typedMessage = {
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
};
const rsv = {
  v: 55,
  r: "4f4c17305743700648bc4f6cd3038ec6f6af0df73e31757007b7f59df7bee88d",
  s: "7e1941b264348e80c78c4027afc65a87b0a5e43e86742b8ca0823584c6788fd0",
};
const signature =
  "0x4f4c17305743700648bc4f6cd3038ec6f6af0df73e31757007b7f59df7bee88d7e1941b264348e80c78c4027afc65a87b0a5e43e86742b8ca0823584c6788fd01c";

describe("LedgerHandler", () => {
  let ethereumMockedProvider: EthereumMockedProvider;
  let eth: typeof Eth.default;
  let ledgerHandler: LedgerHandler;

  before(async () => {
    ethereumMockedProvider = new EthereumMockedProvider();
  });

  beforeEach(async () => {
    await remove(tmpCachePath);
  });

  after(async () => {
    await remove(tmpCachePath);
  });

  describe("class constructor", () => {
    it("should lowercase all accounts", () => {
      const uppercaseAccounts = LEDGER_ADDRESSES.map((a) => a.toUpperCase());

      const uppercaseProvider = new LedgerHandler(
        ethereumMockedProvider,
        {
          accounts: uppercaseAccounts,
          derivationFunction: undefined,
        },
        mockedDisplayInfo.fn,
      );

      const lowercasedAccounts = uppercaseAccounts.map((a) => a.toLowerCase());

      assert.deepEqual(uppercaseProvider.options.accounts, lowercasedAccounts);
    });

    it("should check for valid ethereum addresses", () => {
      assertThrowsHardhatError(
        () =>
          new LedgerHandler(
            ethereumMockedProvider,
            {
              accounts: [
                "0xe149ff2797adc146aa2d68d3df3e819c3c38e762",
                "0x1",
                "0x343fe45cd2d785a5F2e97a00de8436f9c42Ef444",
              ],
              derivationFunction: undefined,
            },
            mockedDisplayInfo.fn,
          ),
        HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.INVALID_LEDGER_ADDRESS,
        {
          address: "0x1",
        },
      );
    });
  });

  describe("getLedgerAccounts", async () => {
    it("should return the ledger accounts", async () => {
      ledgerHandler = new LedgerHandler(
        ethereumMockedProvider,
        {
          accounts: LEDGER_ADDRESSES,
          derivationFunction: undefined,
        },
        mockedDisplayInfo.fn,
      );

      const res = ledgerHandler.getLedgerAccounts();

      assert.deepEqual(res, LEDGER_ADDRESSES);
    });
  });

  describe("init", () => {
    it("should only init once on multiple calls", async () => {
      mockedDisplayInfo.clear();

      ledgerHandler = new LedgerHandler(
        ethereumMockedProvider,
        {
          accounts: LEDGER_ADDRESSES,
          derivationFunction: undefined,
        },
        mockedDisplayInfo.fn,
        { transportNodeHid: getTransportNodeHidMock() },
      );

      await ledgerHandler.init();
      await ledgerHandler.init();
      await ledgerHandler.init();

      // When init is called once, only 2 messages should be displayed
      assert.equal(mockedDisplayInfo.totCalls, 2);
    });

    it("should throw a ledger provider error if `create` fails", async () => {
      const error = new Error("Test error");

      const transportNodeHid = getTransportNodeHidMock();
      transportNodeHid.create = () => {
        throw error;
      };

      ledgerHandler = new LedgerHandler(
        ethereumMockedProvider,
        {
          accounts: LEDGER_ADDRESSES,
          derivationFunction: undefined,
        },
        mockedDisplayInfo.fn,
        { transportNodeHid },
      );

      await assertRejectsWithHardhatError(
        () => ledgerHandler.init(),
        HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.CONNECTION_ERROR,
        {
          error,
          transportId: "",
        },
      );
    });

    it("should throw a ledger provider error if a transport error occurs", async () => {
      const error = new TransportError("Transport Error", "Transport Error Id");

      const transportNodeHid = getTransportNodeHidMock();
      transportNodeHid.create = () => {
        throw error;
      };

      ledgerHandler = new LedgerHandler(
        ethereumMockedProvider,
        {
          accounts: LEDGER_ADDRESSES,
          derivationFunction: undefined,
        },
        mockedDisplayInfo.fn,
        {
          transportNodeHid,
          // Set maxDeviceNotReadyRetries to 0 so the test fails immediately
          // without retrying (which would cause actual 30s sleeps)
          maxDeviceNotReadyRetries: 0,
        },
      );

      await assertRejectsWithHardhatError(
        () => ledgerHandler.init(),
        HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.CONNECTION_ERROR,
        {
          error,
          transportId: "Transport Error Id",
        },
      );
    });

    it("should start the paths cache with what the cache returns", async () => {
      await writeJsonFile(tmpCachePath, {
        "0xe149ff2797adc146aa2d68d3df3e819c3c38e762": "m/44'/60'/0'/0/0",
      });

      ledgerHandler = new LedgerHandler(
        ethereumMockedProvider,
        {
          accounts: LEDGER_ADDRESSES,
          derivationFunction: undefined,
        },
        mockedDisplayInfo.fn,
        {
          transportNodeHid: getTransportNodeHidMock(),
          cachePath: tmpCachePath,
        },
      );

      assert.deepEqual(ledgerHandler.paths, {});

      await ledgerHandler.init();

      assert.deepEqual(ledgerHandler.paths, {
        "0xe149ff2797adc146aa2d68d3df3e819c3c38e762": "m/44'/60'/0'/0/0",
      });
    });

    describe("TransportError retry (device not connected)", () => {
      // No-op sleep for fast tests
      const noOpSleep = async (_seconds: number): Promise<void> => {};

      it("should retry and succeed after 2 TransportError retries", async () => {
        let createCallCount = 0;

        const transportNodeHid = getTransportNodeHidMock();
        const originalCreate = transportNodeHid.create.bind(transportNodeHid);

        transportNodeHid.create = async (...args: any[]) => {
          createCallCount++;
          if (createCallCount <= 2) {
            throw new TransportError("No Ledger device found", "NoDeviceFound");
          }
          return originalCreate(...args);
        };

        ledgerHandler = new LedgerHandler(
          ethereumMockedProvider,
          {
            accounts: LEDGER_ADDRESSES,
            derivationFunction: undefined,
          },
          mockedDisplayInfo.fn,
          {
            transportNodeHid,
            delayBeforeRetry: noOpSleep,
          },
        );

        mockedDisplayInfo.clear();

        await ledgerHandler.init();

        assert.equal(
          createCallCount,
          3,
          "Transport create should be called 3 times (2 failures + 1 success)",
        );

        // Verify the not-connected message was displayed twice
        const notConnectedMessages = mockedDisplayInfo.messages.filter((m) =>
          m.includes("Device not connected"),
        );
        assert.equal(
          notConnectedMessages.length,
          2,
          "Device not connected message should be displayed twice",
        );

        // Verify successful connection message was displayed
        assert.ok(
          mockedDisplayInfo.messages.includes("Connection successful"),
          "Connection successful message should be displayed",
        );
      });

      it("should throw CONNECTION_ERROR after max retries", async () => {
        let createCallCount = 0;
        const transportError = new TransportError(
          "No Ledger device found",
          "NoDeviceFound",
        );

        const transportNodeHid = getTransportNodeHidMock();
        transportNodeHid.create = async () => {
          createCallCount++;
          throw transportError;
        };

        ledgerHandler = new LedgerHandler(
          ethereumMockedProvider,
          {
            accounts: LEDGER_ADDRESSES,
            derivationFunction: undefined,
          },
          mockedDisplayInfo.fn,
          {
            transportNodeHid,
            delayBeforeRetry: noOpSleep,
            maxDeviceNotReadyRetries: 5,
          },
        );

        mockedDisplayInfo.clear();

        await assertRejectsWithHardhatError(
          () => ledgerHandler.init(),
          HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.CONNECTION_ERROR,
          {
            error: transportError,
            transportId: "NoDeviceFound",
          },
        );

        assert.equal(
          createCallCount,
          6,
          "Transport create should be called 6 times (5 retries + 1 initial)",
        );

        // Verify the not-connected message was displayed 5 times (once per retry, not on final failure)
        const notConnectedMessages = mockedDisplayInfo.messages.filter((m) =>
          m.includes("Device not connected"),
        );
        assert.equal(
          notConnectedMessages.length,
          5,
          "Device not connected message should be displayed 5 times",
        );

        // Verify connection error message was displayed on final failure
        assert.ok(
          mockedDisplayInfo.messages.includes("Connection error"),
          "Connection error message should be displayed on final failure",
        );
      });
    });
  });

  describe("request", function () {
    it("should forward the request without modifying it for the unsupported JSONRPC methods", async () => {
      ledgerHandler = new LedgerHandler(
        ethereumMockedProvider,
        {
          accounts: LEDGER_ADDRESSES,
          derivationFunction: undefined,
        },
        mockedDisplayInfo.fn,
      );

      let request = createJsonRpcRequest("eth_blockNumber");
      let res = await ledgerHandler.handle(request);
      assert.deepEqual(res, request);

      request = createJsonRpcRequest("eth_getBlockByNumber", [1n]);
      res = await ledgerHandler.handle(request);
      assert.deepEqual(res, request);
    });

    describe("supported (sign) methods", () => {
      it("should forward the request without modifying it if the address doing the signing is not controlled", async () => {
        const uncontrolledAddress =
          "0x76F8654a8e981A4a5D634c2d3cE56E195a65c319";

        const requestArgs = [
          {
            method: "eth_sign",
            params: [uncontrolledAddress, dataToSign],
          },
          {
            method: "personal_sign",
            params: [dataToSign, uncontrolledAddress],
          },
          {
            method: "eth_signTypedData_v4",
            params: [uncontrolledAddress, typedMessage],
          },
          {
            method: "eth_sendTransaction",
            params: [
              {
                from: uncontrolledAddress,
                to: LEDGER_ADDRESSES[1],
                value: "0x100",
                gas: "0x1000000",
                gasPrice: "0x100",
              },
            ],
          },
        ];

        ledgerHandler = new LedgerHandler(
          ethereumMockedProvider,
          {
            accounts: LEDGER_ADDRESSES,
            derivationFunction: undefined,
          },
          mockedDisplayInfo.fn,
        );

        for (const args of requestArgs) {
          const request = createJsonRpcRequest(args.method, args.params);

          const res = await ledgerHandler.handle(request);

          assert.deepEqual(res, request);
        }
      });

      it("should successfully handle the method eth_sign", async () => {
        [eth] = getEthMocked({
          getAddress: {
            result: (searchedPath: string) => {
              return searchedPath === derPath
                ? account
                : { address: "0x0", publicKey: "0x0" };
            },
          },
          signPersonalMessage: {
            result: rsv,
            expectedParams: {
              path: derPath,
              data: dataToSign.replace("0x", ""),
            },
          },
        });

        ledgerHandler = new LedgerHandler(
          ethereumMockedProvider,
          {
            accounts: LEDGER_ADDRESSES,
            derivationFunction: undefined,
          },
          mockedDisplayInfo.fn,
          {
            ethConstructor: eth,
            transportNodeHid: getTransportNodeHidMock(),
            cachePath: tmpCachePath,
          },
        );

        const request = createJsonRpcRequest("eth_sign", [
          account.address,
          dataToSign,
        ]);

        const res = await ledgerHandler.handle(request);

        assert.ok(res !== null, "res should not be null");
        assert.ok("result" in res, "res should have the property 'result'");

        assert.deepEqual(res.result, signature);
      });

      it("should successfully handle the method personal_sign", async () => {
        [eth] = getEthMocked({
          getAddress: {
            result: (searchedPath: string) => {
              return searchedPath === derPath
                ? account
                : { address: "0x0", publicKey: "0x0" };
            },
          },
          signPersonalMessage: {
            result: rsv,
            expectedParams: {
              path: derPath,
              data: dataToSign.replace("0x", ""),
            },
          },
        });

        ledgerHandler = new LedgerHandler(
          ethereumMockedProvider,
          {
            accounts: LEDGER_ADDRESSES,
            derivationFunction: undefined,
          },
          mockedDisplayInfo.fn,
          {
            ethConstructor: eth,
            transportNodeHid: getTransportNodeHidMock(),
            cachePath: tmpCachePath,
          },
        );

        const request = createJsonRpcRequest("personal_sign", [
          dataToSign,
          account.address,
        ]);

        const res = await ledgerHandler.handle(request);

        assert.ok(res !== null, "res should not be null");
        assert.ok("result" in res, "res should have the property 'result'");

        assert.deepEqual(res.result, signature);
      });

      it("should successfully handle the method eth_signTypedData_v4 for EIP712Message", async () => {
        [eth] = getEthMocked({
          getAddress: {
            result: (searchedPath: string) => {
              return searchedPath === derPath
                ? account
                : { address: "0x0", publicKey: "0x0" };
            },
          },
          signEIP712Message: {
            result: rsv,
            expectedParams: {
              path: derPath,
              jsonMessage: typedMessage,
            },
            shouldThrow: false,
          },
        });

        ledgerHandler = new LedgerHandler(
          ethereumMockedProvider,
          {
            accounts: LEDGER_ADDRESSES,
            derivationFunction: undefined,
          },
          mockedDisplayInfo.fn,
          {
            ethConstructor: eth,
            transportNodeHid: getTransportNodeHidMock(),
            cachePath: tmpCachePath,
          },
        );

        const request = createJsonRpcRequest("eth_signTypedData_v4", [
          account.address,
          typedMessage,
        ]);

        const res = await ledgerHandler.handle(request);

        assert.ok(res !== null, "res should not be null");
        assert.ok("result" in res, "res should have the property 'result'");

        assert.deepEqual(res.result, signature);
      });

      it("should successfully handle the method eth_signTypedData_v4 for HashedMessage", async () => {
        [eth] = getEthMocked({
          getAddress: {
            result: (searchedPath: string) => {
              return searchedPath === derPath
                ? account
                : { address: "0x0", publicKey: "0x0" };
            },
          },
          signEIP712Message: {
            shouldThrow: true,
          },
          signEIP712HashedMessage: {
            result: rsv,
            expectedParams: {
              path: derPath,
              domainSeparatorHex:
                "0xf2cee375fa42b42143804025fc449deafd50cc031ca257e0b194a650a912090f",
              hashStructMessageHex:
                "0xc52c0ee5d84264471806290a3f2c4cecfc5490626bf912d01f240d7a274b371e",
            },
          },
        });

        ledgerHandler = new LedgerHandler(
          ethereumMockedProvider,
          {
            accounts: LEDGER_ADDRESSES,
            derivationFunction: undefined,
          },
          mockedDisplayInfo.fn,
          {
            ethConstructor: eth,
            transportNodeHid: getTransportNodeHidMock(),
            cachePath: tmpCachePath,
          },
        );

        const request = createJsonRpcRequest("eth_signTypedData_v4", [
          account.address,
          typedMessage,
        ]);

        const res = await ledgerHandler.handle(request);

        assert.ok(res !== null, "res should not be null");
        assert.ok("result" in res, "res should have the property 'result'");

        assert.deepEqual(res.result, signature);
      });

      describe("all transaction types", () => {
        beforeEach(() => {
          ethereumMockedProvider.resetNumberOfCalls("eth_getTransactionCount");
          ethereumMockedProvider.resetNumberOfCalls("eth_chainId");
        });

        it("should throw for eip7702 transactions because they are not supported in the current ledger library", async () => {
          [eth] = getEthMocked({
            getAddress: {
              result: (searchedPath: string) => {
                return searchedPath === derPath
                  ? account
                  : { address: "0x0", publicKey: "0x0" };
              },
            },
          });

          ethereumMockedProvider.setReturnValue("eth_chainId", "0x7a69");
          ethereumMockedProvider.setReturnValue(
            "eth_getTransactionCount",
            "0x64",
          );

          ledgerHandler = new LedgerHandler(
            ethereumMockedProvider,
            {
              accounts: LEDGER_ADDRESSES,
              derivationFunction: undefined,
            },
            mockedDisplayInfo.fn,
            {
              ethConstructor: eth,
              transportNodeHid: getTransportNodeHidMock(),
              cachePath: tmpCachePath,
            },
          );

          const request = createJsonRpcRequest("eth_sendTransaction", [
            {
              from: account.address,
              to: LEDGER_ADDRESSES[1],
              value: numberToHexString(100),
              gas: numberToHexString(1000001),
              maxFeePerGas: numberToHexString(1000001),
              maxPriorityFeePerGas: numberToHexString(1000001),
              authorizationList: [],
              accessList: [
                {
                  address: "0xa809931e3b38059adae9bc5455bc567d0509ab92",
                  storageKeys: [
                    "0x0000000000000000000000000000000000000000000000000000000000000000",
                  ],
                },
              ],
            },
          ]);

          await assertRejectsWithHardhatError(
            ledgerHandler.handle(request),
            HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL
              .EIP_7702_TX_CURRENTLY_NOT_SUPPORTED,
            {},
          );
        });

        it("should successfully handle the method eth_sendTransaction for legacy transactions", async () => {
          const signedRawTx =
            "0xf8626465830f424194da6a52afdae5ff66aa786da68754a227331f56e3648082f4f5a04ab14d7e96a8bc7390cfffa0260d4b82848428ce7f5b8dd367d13bf31944b6c0a03cc226daa6a2f4e22334c59c2e04ac72672af72907ec9c4a601189858ba60069";

          const txRsv = {
            v: "f4f5",
            r: "4ab14d7e96a8bc7390cfffa0260d4b82848428ce7f5b8dd367d13bf31944b6c0",
            s: "3cc226daa6a2f4e22334c59c2e04ac72672af72907ec9c4a601189858ba60069",
          };

          [eth] = getEthMocked({
            getAddress: {
              result: (searchedPath: string) => {
                return searchedPath === derPath
                  ? account
                  : { address: "0x0", publicKey: "0x0" };
              },
            },
            signTransaction: {
              result: txRsv,
              expectedParams: {
                path: derPath,
                rawTxHex:
                  "e26465830f424194da6a52afdae5ff66aa786da68754a227331f56e36480827a698080",
                resolution: {
                  nfts: [],
                  erc20Tokens: [],
                  externalPlugin: [],
                  plugin: [],
                  domains: [],
                },
              },
            },
          });

          ethereumMockedProvider.setReturnValue("eth_chainId", "0x7a69");
          ethereumMockedProvider.setReturnValue(
            "eth_getTransactionCount",
            "0x64",
          );

          ledgerHandler = new LedgerHandler(
            ethereumMockedProvider,
            {
              accounts: LEDGER_ADDRESSES,
              derivationFunction: undefined,
            },
            mockedDisplayInfo.fn,
            {
              ethConstructor: eth,
              transportNodeHid: getTransportNodeHidMock(),
              cachePath: tmpCachePath,
            },
          );

          const request = createJsonRpcRequest("eth_sendTransaction", [
            {
              from: account.address,
              to: LEDGER_ADDRESSES[1],
              value: numberToHexString(100),
              gas: numberToHexString(1000001),
              gasPrice: numberToHexString(101),
            },
          ]);

          const modifiedRequest = await ledgerHandler.handle(request);

          assert.ok(modifiedRequest !== null, "res should not be null");
          assert.ok(
            "method" in modifiedRequest &&
              Array.isArray(modifiedRequest.params),
            "modifiedRequest should have the property 'method' ana params should be an array",
          );

          assert.equal(modifiedRequest.method, "eth_sendRawTransaction");
          assert.equal(modifiedRequest.params[0], signedRawTx);

          assert.equal(
            ethereumMockedProvider.getNumberOfCalls("eth_getTransactionCount"),
            1,
          );
          assert.deepEqual(
            ethereumMockedProvider.getLatestParams("eth_getTransactionCount"),
            [account.address, "pending"],
          );

          assert.equal(
            ethereumMockedProvider.getNumberOfCalls("eth_chainId"),
            1,
          );
        });

        it("should successfully handle the method eth_sendTransaction for eip1559 transactions", async () => {
          const signedRawTx =
            "0x02f8a4827a6964830f4241830f4241830f424194da6a52afdae5ff66aa786da68754a227331f56e36480f838f794a809931e3b38059adae9bc5455bc567d0509ab92e1a0000000000000000000000000000000000000000000000000000000000000000080a04ab14d7e96a8bc7390cfffa0260d4b82848428ce7f5b8dd367d13bf31944b6c0a03cc226daa6a2f4e22334c59c2e04ac72672af72907ec9c4a601189858ba60069";

          const txRsv = {
            v: "f4f5",
            r: "4ab14d7e96a8bc7390cfffa0260d4b82848428ce7f5b8dd367d13bf31944b6c0",
            s: "3cc226daa6a2f4e22334c59c2e04ac72672af72907ec9c4a601189858ba60069",
          };

          [eth] = getEthMocked({
            getAddress: {
              result: (searchedPath: string) => {
                return searchedPath === derPath
                  ? account
                  : { address: "0x0", publicKey: "0x0" };
              },
            },
            signTransaction: {
              result: txRsv,
              expectedParams: {
                path: derPath,
                rawTxHex:
                  "02f861827a6964830f4241830f4241830f424194da6a52afdae5ff66aa786da68754a227331f56e36480f838f794a809931e3b38059adae9bc5455bc567d0509ab92e1a00000000000000000000000000000000000000000000000000000000000000000",
                resolution: {
                  nfts: [],
                  erc20Tokens: [],
                  externalPlugin: [],
                  plugin: [],
                  domains: [],
                },
              },
            },
          });

          ethereumMockedProvider.setReturnValue("eth_chainId", "0x7a69");
          ethereumMockedProvider.setReturnValue(
            "eth_getTransactionCount",
            "0x64",
          );

          ledgerHandler = new LedgerHandler(
            ethereumMockedProvider,
            {
              accounts: LEDGER_ADDRESSES,
              derivationFunction: undefined,
            },
            mockedDisplayInfo.fn,
            {
              ethConstructor: eth,
              transportNodeHid: getTransportNodeHidMock(),
              cachePath: tmpCachePath,
            },
          );

          const request = createJsonRpcRequest("eth_sendTransaction", [
            {
              from: account.address,
              to: LEDGER_ADDRESSES[1],
              value: numberToHexString(100),
              gas: numberToHexString(1000001),
              maxFeePerGas: numberToHexString(1000001),
              maxPriorityFeePerGas: numberToHexString(1000001),
              accessList: [
                {
                  address: "0xa809931e3b38059adae9bc5455bc567d0509ab92",
                  storageKeys: [
                    "0x0000000000000000000000000000000000000000000000000000000000000000",
                  ],
                },
              ],
            },
          ]);

          const modifiedRequest = await ledgerHandler.handle(request);

          assert.ok(modifiedRequest !== null, "res should not be null");
          assert.ok(
            "method" in modifiedRequest &&
              Array.isArray(modifiedRequest.params),
            "modifiedRequest should have the property 'method' ana params should be an array",
          );

          assert.equal(modifiedRequest.method, "eth_sendRawTransaction");
          assert.equal(modifiedRequest.params[0], signedRawTx);

          assert.equal(
            ethereumMockedProvider.getNumberOfCalls("eth_getTransactionCount"),
            1,
          );
          assert.deepEqual(
            ethereumMockedProvider.getLatestParams("eth_getTransactionCount"),
            [account.address, "pending"],
          );

          assert.equal(
            ethereumMockedProvider.getNumberOfCalls("eth_chainId"),
            1,
          );
        });

        it("should successfully handle the method eth_sendTransaction for eip2930 transactions", async () => {
          const signedRawTx =
            "0x01f8a0827a6964830f4241830f424194da6a52afdae5ff66aa786da68754a227331f56e36480f838f794a809931e3b38059adae9bc5455bc567d0509ab92e1a0000000000000000000000000000000000000000000000000000000000000000080a04ab14d7e96a8bc7390cfffa0260d4b82848428ce7f5b8dd367d13bf31944b6c0a03cc226daa6a2f4e22334c59c2e04ac72672af72907ec9c4a601189858ba60069";

          const txRsv = {
            v: "f4f5",
            r: "4ab14d7e96a8bc7390cfffa0260d4b82848428ce7f5b8dd367d13bf31944b6c0",
            s: "3cc226daa6a2f4e22334c59c2e04ac72672af72907ec9c4a601189858ba60069",
          };

          [eth] = getEthMocked({
            getAddress: {
              result: (searchedPath: string) => {
                return searchedPath === derPath
                  ? account
                  : { address: "0x0", publicKey: "0x0" };
              },
            },
            signTransaction: {
              result: txRsv,
              expectedParams: {
                path: derPath,
                rawTxHex:
                  "01f85d827a6964830f4241830f424194da6a52afdae5ff66aa786da68754a227331f56e36480f838f794a809931e3b38059adae9bc5455bc567d0509ab92e1a00000000000000000000000000000000000000000000000000000000000000000",
                resolution: {
                  nfts: [],
                  erc20Tokens: [],
                  externalPlugin: [],
                  plugin: [],
                  domains: [],
                },
              },
            },
          });

          ethereumMockedProvider.setReturnValue("eth_chainId", "0x7a69");
          ethereumMockedProvider.setReturnValue(
            "eth_getTransactionCount",
            "0x64",
          );

          ledgerHandler = new LedgerHandler(
            ethereumMockedProvider,
            {
              accounts: LEDGER_ADDRESSES,
              derivationFunction: undefined,
            },
            mockedDisplayInfo.fn,
            {
              ethConstructor: eth,
              transportNodeHid: getTransportNodeHidMock(),
              cachePath: tmpCachePath,
            },
          );

          const request = createJsonRpcRequest("eth_sendTransaction", [
            {
              from: account.address,
              to: LEDGER_ADDRESSES[1],
              value: numberToHexString(100),
              gas: numberToHexString(1000001),
              gasPrice: numberToHexString(1000001),
              accessList: [
                {
                  address: "0xa809931e3b38059adae9bc5455bc567d0509ab92",
                  storageKeys: [
                    "0x0000000000000000000000000000000000000000000000000000000000000000",
                  ],
                },
              ],
            },
          ]);

          const modifiedRequest = await ledgerHandler.handle(request);

          assert.ok(modifiedRequest !== null, "res should not be null");
          assert.ok(
            "method" in modifiedRequest &&
              Array.isArray(modifiedRequest.params),
            "modifiedRequest should have the property 'method' ana params should be an array",
          );

          assert.equal(modifiedRequest.method, "eth_sendRawTransaction");
          assert.equal(modifiedRequest.params[0], signedRawTx);

          assert.equal(
            ethereumMockedProvider.getNumberOfCalls("eth_getTransactionCount"),
            1,
          );
          assert.deepEqual(
            ethereumMockedProvider.getLatestParams("eth_getTransactionCount"),
            [account.address, "pending"],
          );

          assert.equal(
            ethereumMockedProvider.getNumberOfCalls("eth_chainId"),
            1,
          );
        });
      });
    });

    describe("path derivation", () => {
      let calls: Map<string, { totalCalls: number; args: any[] }>;
      const request = createJsonRpcRequest("personal_sign", [
        dataToSign,
        account.address,
      ]);

      beforeEach(async () => {
        [eth, calls] = getEthMocked({
          getAddress: {
            result: (searchedPath: string) => {
              return searchedPath === derPath
                ? account
                : { address: "0x0", publicKey: "0x0" };
            },
          },
          signPersonalMessage: {
            result: rsv,
            expectedParams: {
              path: derPath,
              data: dataToSign.replace("0x", ""),
            },
          },
        });

        ledgerHandler = new LedgerHandler(
          ethereumMockedProvider,
          {
            accounts: LEDGER_ADDRESSES,
            derivationFunction: undefined,
          },
          mockedDisplayInfo.fn,
          {
            ethConstructor: eth,
            transportNodeHid: getTransportNodeHidMock(),
            cachePath: tmpCachePath,
          },
        );
      });

      it("should cache the derived path from the supplied accounts", async () => {
        const c = calls.get("getAddress");
        assertHardhatInvariant(c !== undefined, "c should be defined");

        await ledgerHandler.handle(request);
        await ledgerHandler.handle(request);
        await ledgerHandler.handle(request);
        await ledgerHandler.handle(request);

        assert.equal(c.args[0], "m/44'/60'/0'/0/0");
        assert.equal(c.args[1], "m/44'/60'/1'/0/0");
        assert.equal(c.totalCalls, 2);
      });

      it("should cache the path per address on the paths property", async () => {
        await ledgerHandler.handle(request);
        await ledgerHandler.handle(request);

        assert.deepEqual(ledgerHandler.paths, {
          [LEDGER_ADDRESSES[1]]: derPath,
        });
      });

      it("should write the cache with the new paths", async () => {
        await ledgerHandler.handle(request);

        const file = await readJsonFile(tmpCachePath);

        assert.deepEqual(file, {
          [LEDGER_ADDRESSES[1]]: derPath,
        });
      });

      it("should not break if caching fails", async () => {
        let hasThrown = false;
        try {
          await ledgerHandler.handle(request);
        } catch (_error) {
          hasThrown = true;
        }

        assert.equal(hasThrown, false);
      });

      it("should throw a DerivationPathError if trying to get the address fails", async () => {
        const errorMessage = "Test:error: getting the address broke";

        [eth] = getEthMocked({
          getAddress: {
            result: () => {
              throw new Error(errorMessage);
            },
          },
        });

        ledgerHandler = new LedgerHandler(
          ethereumMockedProvider,
          {
            accounts: LEDGER_ADDRESSES,
            derivationFunction: undefined,
          },
          mockedDisplayInfo.fn,
          {
            ethConstructor: eth,
            transportNodeHid: getTransportNodeHidMock(),
            cachePath: tmpCachePath,
          },
        );

        await assertRejectsWithHardhatError(
          () => ledgerHandler.handle(request),
          HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.ERROR_WHILE_DERIVING_PATH,
          {
            path: "m/44'/60'/0'/0/0",
            message: errorMessage,
          },
        );
      });

      it("should throw a DerivationPathError if the max number of derivations is searched without a result", async () => {
        [eth] = getEthMocked({
          getAddress: {
            result: () => ({
              address: "0x0",
              publicKey: "0x0",
            }),
          },
        });

        ledgerHandler = new LedgerHandler(
          ethereumMockedProvider,
          {
            accounts: LEDGER_ADDRESSES,
            derivationFunction: undefined,
          },
          mockedDisplayInfo.fn,
          {
            ethConstructor: eth,
            transportNodeHid: getTransportNodeHidMock(),
            cachePath: tmpCachePath,
          },
        );

        await assertRejectsWithHardhatError(
          () => ledgerHandler.handle(request),
          HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL
            .CANNOT_FIND_VALID_DERIVATION_PATH,
          {
            address: LEDGER_ADDRESSES[1],
            pathStart: "m/44'/60'/0'/0/0",
            pathEnd: `m/44'/60'/${LedgerHandler.MAX_DERIVATION_ACCOUNTS}'/0/0`,
          },
        );
      });

      it("should use the supplied derivationFunction when deriving paths", async () => {
        const customDerivation = (idx: number) =>
          `m/44'/60'/${1337 + idx}'/0/0`;

        const expectedPath = customDerivation(0);

        [eth, calls] = getEthMocked({
          getAddress: {
            result: (searchedPath: string) =>
              searchedPath === expectedPath
                ? account
                : { address: "0x0", publicKey: "0x0" },
          },
          signPersonalMessage: {
            result: rsv,
            expectedParams: {
              path: expectedPath,
              data: dataToSign.replace("0x", ""),
            },
          },
        });

        ledgerHandler = new LedgerHandler(
          ethereumMockedProvider,
          {
            accounts: LEDGER_ADDRESSES,
            derivationFunction: customDerivation,
          },
          mockedDisplayInfo.fn,
          {
            ethConstructor: eth,
            transportNodeHid: getTransportNodeHidMock(),
            cachePath: tmpCachePath,
          },
        );

        await ledgerHandler.handle(request);

        const c = calls.get("getAddress");
        assertHardhatInvariant(c !== undefined, "c should be defined");

        assert.equal(c.args[0], expectedPath);
      });
    });
  });

  describe("reconnection", () => {
    describe("exhausted retries", () => {
      it("should give up and display failure message after reconnection also fails", async () => {
        const methodsConfig: MethodsConfig = {
          getAddress: {
            result: (searchedPath: string) =>
              searchedPath === derPath
                ? account
                : { address: "0x0", publicKey: "0x0" },
          },
          signPersonalMessage: {
            result: rsv,
            // Need enough errors to exhaust retries (initial + 1 reconnection attempt)
            errorSequenceToThrow: [
              new DisconnectedDevice(),
              new DisconnectedDevice(),
            ],
          },
        };

        const transportState: TransportMockState = { createCount: 0 };
        const [ethMock] = getEthMocked(methodsConfig);

        ledgerHandler = new LedgerHandler(
          ethereumMockedProvider,
          {
            accounts: LEDGER_ADDRESSES,
            derivationFunction: undefined,
          },
          mockedDisplayInfo.fn,
          {
            ethConstructor: ethMock,
            transportNodeHid: getTransportNodeHidMock(transportState),
            cachePath: tmpCachePath,
          },
        );

        mockedDisplayInfo.clear();

        const request = createJsonRpcRequest("personal_sign", [
          dataToSign,
          account.address,
        ]);

        await assertRejects(
          () => ledgerHandler.handle(request),
          (error) => error instanceof DisconnectedDevice,
          "Expected DisconnectedDevice error after exhausted retries",
        );

        assert.equal(
          transportState.createCount,
          2,
          "Transport should be created twice (initial + one reconnection attempt)",
        );
        assert.ok(
          mockedDisplayInfo.messages.includes("Confirmation failure"),
          "Confirmation failure should be displayed after exhausting retries",
        );
        assert.ok(
          mockedDisplayInfo.messages.includes("Reconnecting to Ledger..."),
          "Reconnecting message should be displayed",
        );
      });
    });

    describe("DisconnectedDevice recovery", () => {
      it("should reconnect and succeed when device is unplugged/replugged during signing", async () => {
        const methodsConfig: MethodsConfig = {
          getAddress: {
            result: (searchedPath: string) =>
              searchedPath === derPath
                ? account
                : { address: "0x0", publicKey: "0x0" },
          },
          signPersonalMessage: {
            result: rsv,
            throwOnCall: 2,
            errorSequenceToThrow: [new DisconnectedDevice()],
          },
        };

        const transportState: TransportMockState = { createCount: 0 };
        const [ethMock] = getEthMocked(methodsConfig);

        ledgerHandler = new LedgerHandler(
          ethereumMockedProvider,
          {
            accounts: LEDGER_ADDRESSES,
            derivationFunction: undefined,
          },
          mockedDisplayInfo.fn,
          {
            ethConstructor: ethMock,
            transportNodeHid: getTransportNodeHidMock(transportState),
            cachePath: tmpCachePath,
          },
        );

        // First request should succeed
        const request1 = createJsonRpcRequest("personal_sign", [
          dataToSign,
          account.address,
        ]);
        const res1 = await ledgerHandler.handle(request1);
        assert.ok(res1 !== null, "res1 should not be null");
        assert.ok("result" in res1, "res1 should have the property 'result'");
        assert.deepEqual(res1.result, signature);

        assert.equal(
          transportState.createCount,
          1,
          "Transport should be created once initially",
        );

        // Clear messages before second request to verify reconnection messages
        mockedDisplayInfo.clear();

        // Second request - should reconnect and succeed
        const request2 = createJsonRpcRequest("personal_sign", [
          dataToSign,
          account.address,
        ]);
        const res2 = await ledgerHandler.handle(request2);

        assert.ok(res2 !== null, "res2 should not be null");
        assert.ok("result" in res2, "res2 should have the property 'result'");
        assert.deepEqual(res2.result, signature);

        assert.equal(
          transportState.createCount,
          2,
          "Transport should be created twice (initial + reconnection)",
        );

        assert.ok(
          !mockedDisplayInfo.messages.includes("Confirmation failure"),
          "Confirmation failure should not be displayed on successful reconnection",
        );
        assert.ok(
          mockedDisplayInfo.messages.includes("Reconnecting to Ledger..."),
          "Reconnecting message should be displayed",
        );
      });

      it("should reconnect and succeed when device is disconnected during operation", async () => {
        const methodsConfig: MethodsConfig = {
          getAddress: {
            result: (searchedPath: string) =>
              searchedPath === derPath
                ? account
                : { address: "0x0", publicKey: "0x0" },
          },
          signPersonalMessage: {
            result: rsv,
            throwOnCall: 2,
            errorSequenceToThrow: [new DisconnectedDeviceDuringOperation()],
          },
        };

        const transportState: TransportMockState = { createCount: 0 };
        const [ethMock] = getEthMocked(methodsConfig);

        ledgerHandler = new LedgerHandler(
          ethereumMockedProvider,
          {
            accounts: LEDGER_ADDRESSES,
            derivationFunction: undefined,
          },
          mockedDisplayInfo.fn,
          {
            ethConstructor: ethMock,
            transportNodeHid: getTransportNodeHidMock(transportState),
            cachePath: tmpCachePath,
          },
        );

        // First request should succeed
        const request1 = createJsonRpcRequest("personal_sign", [
          dataToSign,
          account.address,
        ]);
        const res1 = await ledgerHandler.handle(request1);
        assert.ok(res1 !== null, "res1 should not be null");
        assert.ok("result" in res1, "res1 should have the property 'result'");

        // Clear messages before second request to verify reconnection messages
        mockedDisplayInfo.clear();

        // Second request - should reconnect and succeed
        const request2 = createJsonRpcRequest("personal_sign", [
          dataToSign,
          account.address,
        ]);
        const res2 = await ledgerHandler.handle(request2);

        assert.ok(res2 !== null, "res2 should not be null");
        assert.ok("result" in res2, "res2 should have the property 'result'");
        assert.deepEqual(res2.result, signature);

        assert.equal(
          transportState.createCount,
          2,
          "Transport should be created twice (initial + reconnection)",
        );

        assert.ok(
          !mockedDisplayInfo.messages.includes("Confirmation failure"),
          "Confirmation failure should not be displayed on successful reconnection",
        );
        assert.ok(
          mockedDisplayInfo.messages.includes("Reconnecting to Ledger..."),
          "Reconnecting message should be displayed",
        );
      });
    });

    describe("error during path derivation", () => {
      it("should reconnect and succeed when device is disconnected during path derivation", async () => {
        const methodsConfig: MethodsConfig = {
          getAddress: {
            result: (searchedPath: string) =>
              searchedPath === derPath
                ? account
                : { address: "0x0", publicKey: "0x0" },
            throwOnCall: 1,
            errorSequenceToThrow: [new DisconnectedDevice()],
          },
          signPersonalMessage: {
            result: rsv,
          },
        };

        const transportState: TransportMockState = { createCount: 0 };
        const [ethMock] = getEthMocked(methodsConfig);

        ledgerHandler = new LedgerHandler(
          ethereumMockedProvider,
          {
            accounts: LEDGER_ADDRESSES,
            derivationFunction: undefined,
          },
          mockedDisplayInfo.fn,
          {
            ethConstructor: ethMock,
            transportNodeHid: getTransportNodeHidMock(transportState),
            cachePath: tmpCachePath,
          },
        );

        // Clear messages to verify reconnection messages
        mockedDisplayInfo.clear();

        const request = createJsonRpcRequest("personal_sign", [
          dataToSign,
          account.address,
        ]);

        const res = await ledgerHandler.handle(request);

        assert.ok(res !== null, "res should not be null");
        assert.ok("result" in res, "res should have the property 'result'");
        assert.deepEqual(res.result, signature);

        assert.equal(
          transportState.createCount,
          2,
          "Transport should be created twice (initial + reconnection)",
        );

        assert.ok(
          !mockedDisplayInfo.messages.includes("Derivation failure"),
          "Derivation failure should not be displayed on successful reconnection",
        );
        assert.ok(
          mockedDisplayInfo.messages.includes("Reconnecting to Ledger..."),
          "Reconnecting message should be displayed",
        );
      });
    });
  });

  describe("LockedDeviceError handling", () => {
    // No-op sleep for fast tests
    const noOpSleep = async (_seconds: number): Promise<void> => {};

    describe("during signing (#withConfirmation)", () => {
      it("should retry and succeed after 2 LockedDeviceError retries", async () => {
        const methodsConfig: MethodsConfig = {
          getAddress: {
            result: (searchedPath: string) =>
              searchedPath === derPath
                ? account
                : { address: "0x0", publicKey: "0x0" },
          },
          signPersonalMessage: {
            result: rsv,
            // Throw LockedDeviceError twice, then succeed on 3rd call
            errorSequenceToThrow: [
              new LockedDeviceError("Device is locked"),
              new LockedDeviceError("Device is locked"),
            ],
          },
        };

        const transportState: TransportMockState = { createCount: 0 };
        const [ethMock, calls] = getEthMocked(methodsConfig);

        ledgerHandler = new LedgerHandler(
          ethereumMockedProvider,
          {
            accounts: LEDGER_ADDRESSES,
            derivationFunction: undefined,
          },
          mockedDisplayInfo.fn,
          {
            ethConstructor: ethMock,
            transportNodeHid: getTransportNodeHidMock(transportState),
            cachePath: tmpCachePath,
            delayBeforeRetry: noOpSleep,
          },
        );

        mockedDisplayInfo.clear();

        const request = createJsonRpcRequest("personal_sign", [
          dataToSign,
          account.address,
        ]);

        const res = await ledgerHandler.handle(request);

        assert.ok(res !== null, "res should not be null");
        assert.ok("result" in res, "res should have the property 'result'");
        assert.deepEqual(res.result, signature);

        const signCalls = calls.get("signPersonalMessage");
        assert.ok(signCalls !== undefined, "signCalls should be defined");
        assert.equal(
          signCalls.totalCalls,
          3,
          "signPersonalMessage should be called 3 times (2 failures + 1 success)",
        );

        // Verify the locked device message was displayed twice
        const lockedMessages = mockedDisplayInfo.messages.filter((m) =>
          m.includes("Device is locked"),
        );
        assert.equal(
          lockedMessages.length,
          2,
          "Locked device message should be displayed twice",
        );
      });

      it("should throw HardhatError.LOCKED_DEVICE after max retries", async () => {
        const methodsConfig: MethodsConfig = {
          getAddress: {
            result: (searchedPath: string) =>
              searchedPath === derPath
                ? account
                : { address: "0x0", publicKey: "0x0" },
          },
          signPersonalMessage: {
            result: rsv,
            // Need enough errors for maxLockedDeviceRetries (5) + 1 initial = 6 calls
            errorSequenceToThrow: [
              new LockedDeviceError("Device is locked"),
              new LockedDeviceError("Device is locked"),
              new LockedDeviceError("Device is locked"),
              new LockedDeviceError("Device is locked"),
              new LockedDeviceError("Device is locked"),
              new LockedDeviceError("Device is locked"),
            ],
          },
        };

        const transportState: TransportMockState = { createCount: 0 };
        const [ethMock, calls] = getEthMocked(methodsConfig);

        ledgerHandler = new LedgerHandler(
          ethereumMockedProvider,
          {
            accounts: LEDGER_ADDRESSES,
            derivationFunction: undefined,
          },
          mockedDisplayInfo.fn,
          {
            ethConstructor: ethMock,
            transportNodeHid: getTransportNodeHidMock(transportState),
            cachePath: tmpCachePath,
            delayBeforeRetry: noOpSleep,
            maxDeviceNotReadyRetries: 5,
          },
        );

        mockedDisplayInfo.clear();

        const request = createJsonRpcRequest("personal_sign", [
          dataToSign,
          account.address,
        ]);

        await assertRejectsWithHardhatError(
          () => ledgerHandler.handle(request),
          HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.LOCKED_DEVICE,
          {},
        );

        const signCalls = calls.get("signPersonalMessage");
        assert.ok(signCalls !== undefined, "signCalls should be defined");
        assert.equal(
          signCalls.totalCalls,
          6,
          "signPersonalMessage should be called 6 times (5 retries + 1 initial)",
        );
      });

      it("should retry and succeed after app-not-open errors (0x6511)", async () => {
        const methodsConfig: MethodsConfig = {
          getAddress: {
            result: (searchedPath: string) =>
              searchedPath === derPath
                ? account
                : { address: "0x0", publicKey: "0x0" },
          },
          signPersonalMessage: {
            result: rsv,
            // First call: app not open (0x6511)
            // Second call: app not open (0x6511)
            // Third call: success
            errorSequenceToThrow: [
              new TransportStatusError(APP_NOT_OPEN_STATUS_CODE),
              new TransportStatusError(APP_NOT_OPEN_STATUS_CODE),
            ],
          },
        };

        const transportState: TransportMockState = { createCount: 0 };
        const [ethMock, calls] = getEthMocked(methodsConfig);

        ledgerHandler = new LedgerHandler(
          ethereumMockedProvider,
          {
            accounts: LEDGER_ADDRESSES,
            derivationFunction: undefined,
          },
          mockedDisplayInfo.fn,
          {
            ethConstructor: ethMock,
            transportNodeHid: getTransportNodeHidMock(transportState),
            cachePath: tmpCachePath,
            delayBeforeRetry: noOpSleep,
          },
        );

        mockedDisplayInfo.clear();

        const request = createJsonRpcRequest("personal_sign", [
          dataToSign,
          account.address,
        ]);

        const res = await ledgerHandler.handle(request);

        assert.ok(res !== null, "res should not be null");
        assert.ok("result" in res, "res should have the property 'result'");
        assert.deepEqual(res.result, signature);

        const signCalls = calls.get("signPersonalMessage");
        assert.ok(signCalls !== undefined, "signCalls should be defined");
        assert.equal(
          signCalls.totalCalls,
          3,
          "signPersonalMessage should be called 3 times (2 failures + 1 success)",
        );

        // Verify the app-not-open message was displayed twice
        const appNotOpenMessages = mockedDisplayInfo.messages.filter((m) =>
          m.includes("Device not ready"),
        );
        assert.equal(
          appNotOpenMessages.length,
          2,
          "Device not ready message should be displayed twice",
        );
      });

      it("should handle DisconnectedDevice followed by LockedDeviceError followed by app-not-open then succeed", async () => {
        const methodsConfig: MethodsConfig = {
          getAddress: {
            result: (searchedPath: string) =>
              searchedPath === derPath
                ? account
                : { address: "0x0", publicKey: "0x0" },
          },
          signPersonalMessage: {
            result: rsv,
            // First call: DisconnectedDevice (triggers reconnect)
            // Second call: LockedDeviceError (triggers wait/retry)
            // Third call: app not open (0x6511, triggers wait/retry)
            // Fourth call: success
            errorSequenceToThrow: [
              new DisconnectedDevice(),
              new LockedDeviceError("Device is locked"),
              new TransportStatusError(APP_NOT_OPEN_STATUS_CODE),
            ],
          },
        };

        const transportState: TransportMockState = { createCount: 0 };
        const [ethMock, calls] = getEthMocked(methodsConfig);

        ledgerHandler = new LedgerHandler(
          ethereumMockedProvider,
          {
            accounts: LEDGER_ADDRESSES,
            derivationFunction: undefined,
          },
          mockedDisplayInfo.fn,
          {
            ethConstructor: ethMock,
            transportNodeHid: getTransportNodeHidMock(transportState),
            cachePath: tmpCachePath,
            delayBeforeRetry: noOpSleep,
          },
        );

        mockedDisplayInfo.clear();

        const request = createJsonRpcRequest("personal_sign", [
          dataToSign,
          account.address,
        ]);

        const res = await ledgerHandler.handle(request);

        assert.ok(res !== null, "res should not be null");
        assert.ok("result" in res, "res should have the property 'result'");
        assert.deepEqual(res.result, signature);

        const signCalls = calls.get("signPersonalMessage");
        assert.ok(signCalls !== undefined, "signCalls should be defined");
        assert.equal(
          signCalls.totalCalls,
          4,
          "signPersonalMessage should be called 4 times",
        );

        assert.equal(
          transportState.createCount,
          2,
          "Transport should be created twice (initial + reconnection after disconnect)",
        );

        assert.ok(
          mockedDisplayInfo.messages.includes("Reconnecting to Ledger..."),
          "Reconnecting message should be displayed",
        );
        assert.ok(
          mockedDisplayInfo.messages.some((m) =>
            m.includes("Device is locked"),
          ),
          "Locked device message should be displayed",
        );
        assert.ok(
          mockedDisplayInfo.messages.some((m) =>
            m.includes("Device not ready"),
          ),
          "Device not ready message should be displayed",
        );
      });
    });

    describe("during path derivation (#derivePath)", () => {
      it("should retry and succeed after 2 LockedDeviceError retries", async () => {
        const methodsConfig: MethodsConfig = {
          getAddress: {
            result: (searchedPath: string) =>
              searchedPath === derPath
                ? account
                : { address: "0x0", publicKey: "0x0" },
            // Throw LockedDeviceError twice, then succeed
            // Note: derivation may call getAddress multiple times per attempt
            // First call (path 0): LockedDeviceError
            // Second call (path 0 retry): LockedDeviceError
            // Third call (path 0 retry): success, returns wrong address
            // Fourth call (path 1): success, returns correct address
            errorSequenceToThrow: [
              new LockedDeviceError("Device is locked"),
              new LockedDeviceError("Device is locked"),
            ],
          },
          signPersonalMessage: {
            result: rsv,
          },
        };

        const transportState: TransportMockState = { createCount: 0 };
        const [ethMock] = getEthMocked(methodsConfig);

        ledgerHandler = new LedgerHandler(
          ethereumMockedProvider,
          {
            accounts: LEDGER_ADDRESSES,
            derivationFunction: undefined,
          },
          mockedDisplayInfo.fn,
          {
            ethConstructor: ethMock,
            transportNodeHid: getTransportNodeHidMock(transportState),
            cachePath: tmpCachePath,
            delayBeforeRetry: noOpSleep,
          },
        );

        mockedDisplayInfo.clear();

        const request = createJsonRpcRequest("personal_sign", [
          dataToSign,
          account.address,
        ]);

        const res = await ledgerHandler.handle(request);

        assert.ok(res !== null, "res should not be null");
        assert.ok("result" in res, "res should have the property 'result'");
        assert.deepEqual(res.result, signature);

        // Verify the locked device message was displayed twice
        const lockedMessages = mockedDisplayInfo.messages.filter((m) =>
          m.includes("Device is locked"),
        );
        assert.equal(
          lockedMessages.length,
          2,
          "Locked device message should be displayed twice",
        );
      });

      it("should throw HardhatError.LOCKED_DEVICE after max retries", async () => {
        const methodsConfig: MethodsConfig = {
          getAddress: {
            result: () => ({ address: "0x0", publicKey: "0x0" }),
            // Need enough errors for maxLockedDeviceRetries (5) + 1 initial = 6 calls
            errorSequenceToThrow: [
              new LockedDeviceError("Device is locked"),
              new LockedDeviceError("Device is locked"),
              new LockedDeviceError("Device is locked"),
              new LockedDeviceError("Device is locked"),
              new LockedDeviceError("Device is locked"),
              new LockedDeviceError("Device is locked"),
            ],
          },
          signPersonalMessage: {
            result: rsv,
          },
        };

        const transportState: TransportMockState = { createCount: 0 };
        const [ethMock, calls] = getEthMocked(methodsConfig);

        ledgerHandler = new LedgerHandler(
          ethereumMockedProvider,
          {
            accounts: LEDGER_ADDRESSES,
            derivationFunction: undefined,
          },
          mockedDisplayInfo.fn,
          {
            ethConstructor: ethMock,
            transportNodeHid: getTransportNodeHidMock(transportState),
            cachePath: tmpCachePath,
            delayBeforeRetry: noOpSleep,
            maxDeviceNotReadyRetries: 5,
          },
        );

        mockedDisplayInfo.clear();

        const request = createJsonRpcRequest("personal_sign", [
          dataToSign,
          account.address,
        ]);

        await assertRejectsWithHardhatError(
          () => ledgerHandler.handle(request),
          HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.LOCKED_DEVICE,
          {},
        );

        const getAddressCalls = calls.get("getAddress");
        assert.ok(
          getAddressCalls !== undefined,
          "getAddressCalls should be defined",
        );
        assert.equal(
          getAddressCalls.totalCalls,
          6,
          "getAddress should be called 6 times (5 retries + 1 initial)",
        );
      });

      it("should handle DisconnectedDevice followed by LockedDeviceError followed by app-not-open then succeed", async () => {
        const methodsConfig: MethodsConfig = {
          getAddress: {
            result: (searchedPath: string) =>
              searchedPath === derPath
                ? account
                : { address: "0x0", publicKey: "0x0" },
            // First call: DisconnectedDevice (triggers reconnect)
            // Second call: LockedDeviceError (triggers wait/retry)
            // Third call: app not open (0x6511, triggers wait/retry)
            // Fourth+ calls: success
            errorSequenceToThrow: [
              new DisconnectedDevice(),
              new LockedDeviceError("Device is locked"),
              new TransportStatusError(APP_NOT_OPEN_STATUS_CODE),
            ],
          },
          signPersonalMessage: {
            result: rsv,
          },
        };

        const transportState: TransportMockState = { createCount: 0 };
        const [ethMock] = getEthMocked(methodsConfig);

        ledgerHandler = new LedgerHandler(
          ethereumMockedProvider,
          {
            accounts: LEDGER_ADDRESSES,
            derivationFunction: undefined,
          },
          mockedDisplayInfo.fn,
          {
            ethConstructor: ethMock,
            transportNodeHid: getTransportNodeHidMock(transportState),
            cachePath: tmpCachePath,
            delayBeforeRetry: noOpSleep,
          },
        );

        mockedDisplayInfo.clear();

        const request = createJsonRpcRequest("personal_sign", [
          dataToSign,
          account.address,
        ]);

        const res = await ledgerHandler.handle(request);

        assert.ok(res !== null, "res should not be null");
        assert.ok("result" in res, "res should have the property 'result'");
        assert.deepEqual(res.result, signature);

        assert.equal(
          transportState.createCount,
          2,
          "Transport should be created twice (initial + reconnection after disconnect)",
        );

        assert.ok(
          mockedDisplayInfo.messages.includes("Reconnecting to Ledger..."),
          "Reconnecting message should be displayed",
        );
        assert.ok(
          mockedDisplayInfo.messages.some((m) =>
            m.includes("Device is locked"),
          ),
          "Locked device message should be displayed",
        );
        assert.ok(
          mockedDisplayInfo.messages.some((m) =>
            m.includes("Device not ready"),
          ),
          "Device not ready message should be displayed",
        );
      });
    });
  });
});
