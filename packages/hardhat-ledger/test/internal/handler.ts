import type { LedgerDeviceFactory } from "../../src/internal/types.js";
import type {
  MethodsConfig,
  MockCalls,
} from "../helpers/ledger-device-mock.js";

import assert from "node:assert/strict";
import path from "node:path";
import { after, before, beforeEach, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
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
import { addr } from "micro-eth-signer";
import { signTyped } from "micro-eth-signer/typed-data";

import {
  LedgerConnectionClosedError,
  LedgerDeviceError,
  LedgerNoDeviceFoundError,
} from "../../src/internal/dmk-errors.js";
import { LedgerHandler } from "../../src/internal/handler.js";
import { createJsonRpcRequest } from "../helpers/create-json-rpc-request.js";
import { mockedDisplayInfo } from "../helpers/display-info-mock.js";
import { EthereumMockedProvider } from "../helpers/ethereum-provider-mock.js";
import {
  createDeviceFactoryState,
  DEVICE_BUSY_ERROR,
  DEVICE_DISCONNECTED_BEFORE_SENDING_ERROR,
  DEVICE_DISCONNECTED_ERROR,
  DEVICE_LOCKED_ERROR,
  DEVICE_SESSION_NOT_FOUND_ERROR,
  getLedgerDeviceMock,
  NO_ACCESSIBLE_DEVICE_ERROR,
  REFUSED_BY_USER_ERROR,
} from "../helpers/ledger-device-mock.js";

/**
 * The key behind the third Ledger address, so that a test can produce the
 * signature a real device would over the typed data it is sent.
 */
const TYPED_DATA_SIGNER_KEY = `0x${"11".repeat(32)}`;

const LEDGER_ADDRESSES = [
  "0xa809931e3b38059adae9bc5455bc567d0509ab92",
  "0xda6a52afdae5ff66aa786da68754a227331f56e3",
  addr.fromPrivateKey(TYPED_DATA_SIGNER_KEY).toLowerCase(),
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
  primaryType: "Mail" as const,
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
  r: "0x4f4c17305743700648bc4f6cd3038ec6f6af0df73e31757007b7f59df7bee88d",
  s: "0x7e1941b264348e80c78c4027afc65a87b0a5e43e86742b8ca0823584c6788fd0",
};
const signature =
  "0x4f4c17305743700648bc4f6cd3038ec6f6af0df73e31757007b7f59df7bee88d7e1941b264348e80c78c4027afc65a87b0a5e43e86742b8ca0823584c6788fd01c";

const personalSignRequest = createJsonRpcRequest("personal_sign", [
  dataToSign,
  account.address,
]);
const signatureResponse = { jsonrpc: "2.0", id: 1, result: signature };

const typedDataSigner = {
  address: LEDGER_ADDRESSES[2],
  publicKey: "0x2",
};
/** What the device returns for `typedMessage`: a signature by its owner. */
const typedDataSignature = signTyped(
  typedMessage,
  TYPED_DATA_SIGNER_KEY,
  false,
);
const typedDataRsv = {
  r: `0x${typedDataSignature.slice(2, 66)}`,
  s: `0x${typedDataSignature.slice(66, 130)}`,
  v: parseInt(typedDataSignature.slice(130), 16),
};

/** Finds `found` at `accountPath`, and another address anywhere else. */
function findAccountAt(
  accountPath: string,
  found = account,
): NonNullable<MethodsConfig["getAddress"]> {
  return {
    result: (searchedPath) =>
      searchedPath === accountPath
        ? found
        : { address: "0x0", publicKey: "0x0" },
  };
}

async function noOpSleep(): Promise<void> {}

/** Polls until `condition` holds, giving up after 2 seconds. */
async function waitFor(condition: () => boolean): Promise<void> {
  const deadline = Date.now() + 2000;

  while (!condition() && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

describe("LedgerHandler", () => {
  let ethereumMockedProvider: EthereumMockedProvider;
  let ledgerHandler: LedgerHandler;

  function createHandler(
    customConfig: ConstructorParameters<typeof LedgerHandler>[3] = {},
    displayMessage = mockedDisplayInfo.fn,
  ): LedgerHandler {
    return new LedgerHandler(
      ethereumMockedProvider,
      { accounts: LEDGER_ADDRESSES, derivationFunction: undefined },
      displayMessage,
      {
        deviceFactory: getLedgerDeviceMock()[0],
        cachePath: tmpCachePath,
        ...customConfig,
      },
    );
  }

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

  describe("init", () => {
    it("should open a single session when two requests race", async () => {
      // Hardhat does not serialize requests, and a leaked session keeps the
      // process alive.
      const state = createDeviceFactoryState();
      const [deviceFactory] = getLedgerDeviceMock(
        {},
        { state, connectDelayMs: 10 },
      );

      ledgerHandler = createHandler({ deviceFactory });

      await Promise.all([ledgerHandler.init(), ledgerHandler.init()]);

      assert.equal(state.connectCount, 1);

      await ledgerHandler.close();

      assert.equal(state.closeCount, 1);
    });

    it("should report the connection progress", async () => {
      const messages: string[] = [];

      ledgerHandler = createHandler({}, async (_interruptor, message) => {
        messages.push(message);
      });

      await ledgerHandler.init();

      assert.deepEqual(messages, [
        "Connecting to Ledger...",
        "Connection successful",
      ]);
    });

    it("should stop waiting to retry as soon as the handler is closed", async () => {
      // The real retry timer is referenced, so `close()` has to cancel it.
      const [deviceFactory] = getLedgerDeviceMock(
        {},
        { connectionErrors: [NO_ACCESSIBLE_DEVICE_ERROR] },
      );

      mockedDisplayInfo.clear();

      ledgerHandler = createHandler({ deviceFactory });

      const initializing = assertRejectsWithHardhatError(
        () => ledgerHandler.init(),
        HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.CONNECTION_ERROR,
        {
          error: new LedgerDeviceError(NO_ACCESSIBLE_DEVICE_ERROR),
          transportId: NO_ACCESSIBLE_DEVICE_ERROR._tag,
        },
      );

      await waitFor(() =>
        mockedDisplayInfo.messages.some((message) =>
          message.includes("Retrying in"),
        ),
      );

      await ledgerHandler.close();

      const outcome = await Promise.race([
        initializing.then(() => "settled"),
        new Promise((resolve) => setTimeout(resolve, 1000, "still waiting")),
      ]);

      assert.equal(outcome, "settled");
    });

    it("should not start a retry wait once the handler is closed", async () => {
      // `close()` can land while the retry message is displayed, before the
      // real retry timer is armed.
      const [deviceFactory] = getLedgerDeviceMock({
        getAddress: findAccountAt(derPath),
        signMessage: {
          result: rsv,
          errorSequenceToEmit: [DEVICE_LOCKED_ERROR],
        },
      });

      let closing: Promise<void> | undefined;

      ledgerHandler = createHandler(
        { deviceFactory },
        async (_interruptor, message) => {
          if (message.includes("Device is locked")) {
            closing = closing ?? ledgerHandler.close();

            await closing;
          }
        },
      );

      const outcome = await Promise.race([
        ledgerHandler.handle(personalSignRequest).then(
          () => "settled",
          () => "settled",
        ),
        new Promise((resolve) => setTimeout(resolve, 1000, "still waiting")),
      ]);

      assert.equal(outcome, "settled");
    });

    it("should undo a connection that completes after being closed", async () => {
      const state = createDeviceFactoryState();
      const [deviceFactory] = getLedgerDeviceMock(
        {},
        { state, connectDelayMs: 20 },
      );

      ledgerHandler = createHandler({ deviceFactory });

      const initializing = ledgerHandler.init();

      // Close while the session is still being opened.
      await new Promise((resolve) => setTimeout(resolve, 5));
      await ledgerHandler.close();

      await assertRejectsWithHardhatError(
        initializing,
        HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.CONNECTION_ERROR,
        { error: new LedgerConnectionClosedError(), transportId: "" },
      );

      assert.equal(state.connectCount, 1);
      assert.equal(state.closeCount, 1);
    });

    it("should not reconnect after the handler has been closed", async () => {
      const state = createDeviceFactoryState();
      const [deviceFactory] = getLedgerDeviceMock({}, { state });

      ledgerHandler = createHandler({ deviceFactory });

      await ledgerHandler.init();
      await ledgerHandler.close();

      await assertRejectsWithHardhatError(
        () => ledgerHandler.init(),
        HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.CONNECTION_ERROR,
        { error: new LedgerConnectionClosedError(), transportId: "" },
      );

      assert.equal(state.connectCount, 1);
    });

    it("should cancel a device action still running when closed", async () => {
      // The Device Management Kit leaves a running action alone when its
      // session is closed, so a request signing at that moment would outlive
      // the connection and keep the process alive.
      const state = createDeviceFactoryState();
      const [deviceFactory, calls] = getLedgerDeviceMock(
        {
          getAddress: findAccountAt(derPath),
          signMessage: { result: rsv, delayMs: 1000 },
        },
        { state },
      );

      ledgerHandler = createHandler({ deviceFactory });

      const signing = ledgerHandler.handle(personalSignRequest);

      // Close once the device has been asked to sign.
      await waitFor(() => calls.signMessage.totalCalls === 1);
      await ledgerHandler.close();

      await assertRejectsWithHardhatError(
        signing,
        HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.CONNECTION_ERROR,
        { error: new LedgerConnectionClosedError(), transportId: "" },
      );

      assert.equal(state.cancelCount, 1);
      assert.equal(state.closeCount, 1);
    });

    it("should throw a ledger provider error if connecting fails", async () => {
      const error = new Error("Test error");
      const [deviceFactory] = getLedgerDeviceMock(
        {},
        { connectionErrors: [error] },
      );

      ledgerHandler = createHandler({
        deviceFactory,
        delayBeforeRetry: noOpSleep,
      });

      await assertRejectsWithHardhatError(
        () => ledgerHandler.init(),
        HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.CONNECTION_ERROR,
        { error, transportId: "" },
      );
    });

    it("should start the paths cache with what the cache returns", async () => {
      const paths = {
        "0xe149ff2797adc146aa2d68d3df3e819c3c38e762": "m/44'/60'/0'/0/0",
      };

      await writeJsonFile(tmpCachePath, paths);

      ledgerHandler = createHandler();

      assert.deepEqual(ledgerHandler.paths, {});

      await ledgerHandler.init();

      assert.deepEqual(ledgerHandler.paths, paths);
    });

    describe("device-not-connected retry", () => {
      it("should retry and succeed after 2 no-device-found retries", async () => {
        const state = createDeviceFactoryState();
        const [deviceFactory] = getLedgerDeviceMock(
          {},
          {
            state,
            connectionErrors: [
              NO_ACCESSIBLE_DEVICE_ERROR,
              NO_ACCESSIBLE_DEVICE_ERROR,
            ],
          },
        );

        ledgerHandler = createHandler({
          deviceFactory,
          delayBeforeRetry: noOpSleep,
        });

        await ledgerHandler.init();

        assert.equal(state.connectCount, 3);
      });

      it("should throw CONNECTION_ERROR after max retries", async () => {
        const state = createDeviceFactoryState();
        const [deviceFactory] = getLedgerDeviceMock(
          {},
          {
            state,
            connectionErrors: new Array(6).fill(NO_ACCESSIBLE_DEVICE_ERROR),
          },
        );

        ledgerHandler = createHandler({
          deviceFactory,
          delayBeforeRetry: noOpSleep,
          maxDeviceNotReadyRetries: 5,
        });

        mockedDisplayInfo.clear();

        await assertRejectsWithHardhatError(
          () => ledgerHandler.init(),
          HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.CONNECTION_ERROR,
          {
            error: new LedgerDeviceError(NO_ACCESSIBLE_DEVICE_ERROR),
            transportId: NO_ACCESSIBLE_DEVICE_ERROR._tag,
          },
        );

        assert.equal(state.connectCount, 6);
        assert.equal(
          mockedDisplayInfo.messages.filter((m) =>
            m.includes("Device not connected"),
          ).length,
          5,
        );
        assert.ok(
          mockedDisplayInfo.messages.includes("Connection error"),
          "The failure should be displayed",
        );
      });
    });
  });

  describe("request", () => {
    it("should forward the request without modifying it for the unsupported JSONRPC methods", async () => {
      ledgerHandler = createHandler();

      for (const request of [
        createJsonRpcRequest("eth_blockNumber"),
        createJsonRpcRequest("eth_getBlockByNumber", [1n]),
      ]) {
        assert.deepEqual(await ledgerHandler.handle(request), request);
      }
    });

    describe("supported (sign) methods", () => {
      it("should forward the request without modifying it if the address doing the signing is not controlled", async () => {
        const uncontrolledAddress =
          "0x76F8654a8e981A4a5D634c2d3cE56E195a65c319";

        ledgerHandler = createHandler();

        for (const request of [
          createJsonRpcRequest("eth_sign", [uncontrolledAddress, dataToSign]),
          createJsonRpcRequest("personal_sign", [
            dataToSign,
            uncontrolledAddress,
          ]),
          createJsonRpcRequest("eth_signTypedData_v4", [
            uncontrolledAddress,
            typedMessage,
          ]),
          createJsonRpcRequest("eth_sendTransaction", [
            {
              from: uncontrolledAddress,
              to: LEDGER_ADDRESSES[1],
              value: "0x100",
              gas: "0x1000000",
              gasPrice: "0x100",
            },
          ]),
        ]) {
          assert.deepEqual(await ledgerHandler.handle(request), request);
        }
      });

      it("should successfully handle the method eth_sign", async () => {
        const [deviceFactory] = getLedgerDeviceMock({
          getAddress: findAccountAt(derPath),
          signMessage: {
            result: rsv,
            expectedParams: { path: derPath, data: dataToSign },
          },
        });

        ledgerHandler = createHandler({ deviceFactory });

        assert.deepEqual(
          await ledgerHandler.handle(
            createJsonRpcRequest("eth_sign", [account.address, dataToSign]),
          ),
          signatureResponse,
        );
      });

      it("should fail immediately when the user rejects on the device", async () => {
        const [deviceFactory, calls] = getLedgerDeviceMock({
          getAddress: findAccountAt(derPath),
          signMessage: {
            result: rsv,
            errorSequenceToEmit: [REFUSED_BY_USER_ERROR],
          },
        });

        ledgerHandler = createHandler({
          deviceFactory,
          delayBeforeRetry: noOpSleep,
        });

        await assertRejects(
          () => ledgerHandler.handle(personalSignRequest),
          (error) =>
            error instanceof LedgerDeviceError &&
            error.tag === REFUSED_BY_USER_ERROR._tag,
          "Expected the rejection to reach the caller unchanged",
        );

        assert.equal(calls.signMessage.totalCalls, 1, "It must not retry");
      });

      it("should successfully handle the method eth_signTypedData_v4", async () => {
        const [deviceFactory] = getLedgerDeviceMock({
          getAddress: findAccountAt(derPath, typedDataSigner),
          signTypedData: {
            result: typedDataRsv,
            expectedParams: { path: derPath, typedData: typedMessage },
          },
        });

        ledgerHandler = createHandler({ deviceFactory });

        assert.deepEqual(
          await ledgerHandler.handle(
            createJsonRpcRequest("eth_signTypedData_v4", [
              typedDataSigner.address,
              typedMessage,
            ]),
          ),
          { jsonrpc: "2.0", id: 1, result: typedDataSignature },
        );
      });

      it("should reject a signature that is not over the requested typed data", async () => {
        // Whatever the device or the signer kit did to the data, a signature
        // over anything else recovers to another address.
        const [deviceFactory, calls] = getLedgerDeviceMock({
          getAddress: findAccountAt(derPath, typedDataSigner),
          signTypedData: { result: rsv },
        });

        ledgerHandler = createHandler({ deviceFactory });

        await assertRejectsWithHardhatError(
          () =>
            ledgerHandler.handle(
              createJsonRpcRequest("eth_signTypedData_v4", [
                typedDataSigner.address,
                typedMessage,
              ]),
            ),
          HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL
            .ETH_SIGN_TYPED_DATA_V4_INVALID_DATA_PARAM,
          {},
        );

        assert.equal(calls.signTypedData.totalCalls, 1, "It must not retry");
      });

      it("should reject typed data that cannot be hashed faithfully", async () => {
        // A duplicate field name: the signer kit keeps only the last one, and
        // our own hasher refuses to guess.
        const [deviceFactory] = getLedgerDeviceMock({
          getAddress: findAccountAt(derPath, typedDataSigner),
          signTypedData: { result: typedDataRsv },
        });

        ledgerHandler = createHandler({ deviceFactory });

        await assertRejectsWithHardhatError(
          () =>
            ledgerHandler.handle(
              createJsonRpcRequest("eth_signTypedData_v4", [
                typedDataSigner.address,
                {
                  ...typedMessage,
                  types: {
                    ...typedMessage.types,
                    Mail: [
                      ...typedMessage.types.Mail,
                      { name: "contents", type: "string" },
                    ],
                  },
                },
              ]),
            ),
          HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL
            .ETH_SIGN_TYPED_DATA_V4_INVALID_DATA_PARAM,
          {},
        );
      });

      it("should reject typed data that is not valid EIP-712", async () => {
        ledgerHandler = createHandler();

        await assertRejectsWithHardhatError(
          () =>
            ledgerHandler.handle(
              createJsonRpcRequest("eth_signTypedData_v4", [
                account.address,
                { not: "typed data" },
              ]),
            ),
          HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL
            .ETH_SIGN_TYPED_DATA_V4_INVALID_DATA_PARAM,
          {},
        );
      });

      describe("all transaction types", () => {
        const txRsv = {
          v: 0xf4f5,
          r: "0x4ab14d7e96a8bc7390cfffa0260d4b82848428ce7f5b8dd367d13bf31944b6c0",
          s: "0x3cc226daa6a2f4e22334c59c2e04ac72672af72907ec9c4a601189858ba60069",
        };
        const accessList = [
          {
            address: "0xa809931e3b38059adae9bc5455bc567d0509ab92",
            storageKeys: [
              "0x0000000000000000000000000000000000000000000000000000000000000000",
            ],
          },
        ];

        beforeEach(() => {
          ethereumMockedProvider.setReturnValue("eth_chainId", "0x7a69");
          ethereumMockedProvider.setReturnValue(
            "eth_getTransactionCount",
            "0x64",
          );
          ethereumMockedProvider.resetNumberOfCalls("eth_getTransactionCount");
          ethereumMockedProvider.resetNumberOfCalls("eth_chainId");
        });

        it("should throw for eip7702 transactions because they are not supported in the current ledger library", async () => {
          const [deviceFactory] = getLedgerDeviceMock({
            getAddress: findAccountAt(derPath),
          });

          ledgerHandler = createHandler({ deviceFactory });

          const request = createJsonRpcRequest("eth_sendTransaction", [
            {
              from: account.address,
              to: LEDGER_ADDRESSES[1],
              value: numberToHexString(100),
              gas: numberToHexString(1000001),
              maxFeePerGas: numberToHexString(1000001),
              maxPriorityFeePerGas: numberToHexString(1000001),
              authorizationList: [],
              accessList,
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

          const [deviceFactory] = getLedgerDeviceMock({
            getAddress: findAccountAt(derPath),
            signTransaction: {
              result: txRsv,
              expectedParams: {
                path: derPath,
                rawTxHex:
                  "0xe26465830f424194da6a52afdae5ff66aa786da68754a227331f56e36480827a698080",
              },
            },
          });

          ledgerHandler = createHandler({ deviceFactory });

          const request = createJsonRpcRequest("eth_sendTransaction", [
            {
              from: account.address,
              to: LEDGER_ADDRESSES[1],
              value: numberToHexString(100),
              gas: numberToHexString(1000001),
              gasPrice: numberToHexString(101),
            },
          ]);

          assert.deepEqual(await ledgerHandler.handle(request), {
            ...request,
            method: "eth_sendRawTransaction",
            params: [signedRawTx],
          });

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

          const [deviceFactory] = getLedgerDeviceMock({
            getAddress: findAccountAt(derPath),
            signTransaction: {
              result: txRsv,
              expectedParams: {
                path: derPath,
                rawTxHex:
                  "0x02f861827a6964830f4241830f4241830f424194da6a52afdae5ff66aa786da68754a227331f56e36480f838f794a809931e3b38059adae9bc5455bc567d0509ab92e1a00000000000000000000000000000000000000000000000000000000000000000",
              },
            },
          });

          ledgerHandler = createHandler({ deviceFactory });

          const request = createJsonRpcRequest("eth_sendTransaction", [
            {
              from: account.address,
              to: LEDGER_ADDRESSES[1],
              value: numberToHexString(100),
              gas: numberToHexString(1000001),
              maxFeePerGas: numberToHexString(1000001),
              maxPriorityFeePerGas: numberToHexString(1000001),
              accessList,
            },
          ]);

          assert.deepEqual(await ledgerHandler.handle(request), {
            ...request,
            method: "eth_sendRawTransaction",
            params: [signedRawTx],
          });
        });

        it("should successfully handle the method eth_sendTransaction for eip2930 transactions", async () => {
          const signedRawTx =
            "0x01f8a0827a6964830f4241830f424194da6a52afdae5ff66aa786da68754a227331f56e36480f838f794a809931e3b38059adae9bc5455bc567d0509ab92e1a0000000000000000000000000000000000000000000000000000000000000000080a04ab14d7e96a8bc7390cfffa0260d4b82848428ce7f5b8dd367d13bf31944b6c0a03cc226daa6a2f4e22334c59c2e04ac72672af72907ec9c4a601189858ba60069";

          const [deviceFactory] = getLedgerDeviceMock({
            getAddress: findAccountAt(derPath),
            signTransaction: {
              result: txRsv,
              expectedParams: {
                path: derPath,
                rawTxHex:
                  "0x01f85d827a6964830f4241830f424194da6a52afdae5ff66aa786da68754a227331f56e36480f838f794a809931e3b38059adae9bc5455bc567d0509ab92e1a00000000000000000000000000000000000000000000000000000000000000000",
              },
            },
          });

          ledgerHandler = createHandler({ deviceFactory });

          const request = createJsonRpcRequest("eth_sendTransaction", [
            {
              from: account.address,
              to: LEDGER_ADDRESSES[1],
              value: numberToHexString(100),
              gas: numberToHexString(1000001),
              gasPrice: numberToHexString(1000001),
              accessList,
            },
          ]);

          assert.deepEqual(await ledgerHandler.handle(request), {
            ...request,
            method: "eth_sendRawTransaction",
            params: [signedRawTx],
          });
        });
      });
    });

    describe("path derivation", () => {
      let calls: MockCalls;

      beforeEach(() => {
        const [deviceFactory, deviceCalls] = getLedgerDeviceMock({
          getAddress: findAccountAt(derPath),
          signMessage: {
            result: rsv,
            expectedParams: { path: derPath, data: dataToSign },
          },
        });

        calls = deviceCalls;
        ledgerHandler = createHandler({ deviceFactory });
      });

      it("should cache the derived path from the supplied accounts", async () => {
        await ledgerHandler.handle(personalSignRequest);
        await ledgerHandler.handle(personalSignRequest);

        assert.deepEqual(calls.getAddress.args, ["m/44'/60'/0'/0/0", derPath]);
      });

      it("should write the cache with the new paths", async () => {
        await ledgerHandler.handle(personalSignRequest);

        assert.deepEqual(await readJsonFile(tmpCachePath), {
          [LEDGER_ADDRESSES[1]]: derPath,
        });
      });

      it("should throw a DerivationPathError if trying to get the address fails", async () => {
        const errorMessage = "Test:error: getting the address broke";

        const [deviceFactory] = getLedgerDeviceMock({
          getAddress: {
            result: () => {
              throw new Error(errorMessage);
            },
          },
        });

        ledgerHandler = createHandler({ deviceFactory });

        await assertRejectsWithHardhatError(
          () => ledgerHandler.handle(personalSignRequest),
          HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.ERROR_WHILE_DERIVING_PATH,
          { path: "m/44'/60'/0'/0/0", message: errorMessage },
        );
      });

      it("should throw a DerivationPathError if the max number of derivations is searched without a result", async () => {
        const [deviceFactory] = getLedgerDeviceMock({
          getAddress: { result: () => ({ address: "0x0", publicKey: "0x0" }) },
        });

        ledgerHandler = createHandler({ deviceFactory });

        await assertRejectsWithHardhatError(
          () => ledgerHandler.handle(personalSignRequest),
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
        const derivationFunction = (index: number) =>
          `m/44'/60'/${1337 + index}'/0/0`;

        const expectedPath = derivationFunction(0);

        const [deviceFactory, deviceCalls] = getLedgerDeviceMock({
          getAddress: findAccountAt(expectedPath),
          signMessage: {
            result: rsv,
            expectedParams: { path: expectedPath, data: dataToSign },
          },
        });

        ledgerHandler = new LedgerHandler(
          ethereumMockedProvider,
          { accounts: LEDGER_ADDRESSES, derivationFunction },
          mockedDisplayInfo.fn,
          { deviceFactory, cachePath: tmpCachePath },
        );

        await ledgerHandler.handle(personalSignRequest);

        assert.deepEqual(deviceCalls.getAddress.args, [expectedPath]);
      });
    });
  });

  describe("device error recovery", () => {
    describe("during signing (#withConfirmation)", () => {
      it("should reconnect when the signer throws because the session was dropped", async () => {
        // The device was unplugged between requests, or another connection to
        // the same device closed the shared USB link. The signer then throws a
        // raw object before any action starts, instead of emitting an error.
        const state = createDeviceFactoryState();
        const [deviceFactory] = getLedgerDeviceMock(
          {
            getAddress: findAccountAt(derPath),
            signMessage: {
              result: rsv,
              errorsToThrow: [DEVICE_SESSION_NOT_FOUND_ERROR],
            },
          },
          { state },
        );

        ledgerHandler = createHandler({
          deviceFactory,
          delayBeforeRetry: noOpSleep,
        });

        mockedDisplayInfo.clear();

        assert.deepEqual(
          await ledgerHandler.handle(personalSignRequest),
          signatureResponse,
        );

        assert.equal(state.connectCount, 2);
        assert.ok(
          mockedDisplayInfo.messages.includes("Reconnecting to Ledger..."),
          "The reconnection should be displayed",
        );
      });

      it("should give up and display failure message after reconnection also fails", async () => {
        const state = createDeviceFactoryState();
        const [deviceFactory] = getLedgerDeviceMock(
          {
            getAddress: findAccountAt(derPath),
            // The first attempt, and both reconnections.
            signMessage: {
              result: rsv,
              errorSequenceToEmit: new Array(3).fill(DEVICE_DISCONNECTED_ERROR),
            },
          },
          { state },
        );

        ledgerHandler = createHandler({
          deviceFactory,
          delayBeforeRetry: noOpSleep,
        });

        mockedDisplayInfo.clear();

        await assertRejects(
          () => ledgerHandler.handle(personalSignRequest),
          (error) =>
            error instanceof LedgerDeviceError &&
            error.tag === DEVICE_DISCONNECTED_ERROR._tag,
          "Expected the disconnection to reach the caller",
        );

        assert.equal(state.connectCount, 3);
        assert.ok(
          mockedDisplayInfo.messages.includes("Confirmation failure"),
          "The failure should be displayed",
        );
      });

      it("should throw HardhatError.LOCKED_DEVICE after max retries", async () => {
        const [deviceFactory, calls] = getLedgerDeviceMock({
          getAddress: findAccountAt(derPath),
          signMessage: {
            result: rsv,
            errorSequenceToEmit: new Array(6).fill(DEVICE_LOCKED_ERROR),
          },
        });

        ledgerHandler = createHandler({
          deviceFactory,
          delayBeforeRetry: noOpSleep,
          maxDeviceNotReadyRetries: 5,
        });

        await assertRejectsWithHardhatError(
          () => ledgerHandler.handle(personalSignRequest),
          HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.LOCKED_DEVICE,
          {},
        );

        assert.equal(calls.signMessage.totalCalls, 6);
      });

      it("should handle a disconnection, then a locked device, then a busy device, then another disconnection, and succeed", async () => {
        // Opening the Ethereum app on a busy device disconnects it.
        const state = createDeviceFactoryState();
        const [deviceFactory, calls] = getLedgerDeviceMock(
          {
            getAddress: findAccountAt(derPath),
            signMessage: {
              result: rsv,
              errorSequenceToEmit: [
                DEVICE_DISCONNECTED_ERROR,
                DEVICE_LOCKED_ERROR,
                DEVICE_BUSY_ERROR,
                DEVICE_DISCONNECTED_BEFORE_SENDING_ERROR,
              ],
            },
          },
          { state },
        );

        ledgerHandler = createHandler({
          deviceFactory,
          delayBeforeRetry: noOpSleep,
        });

        mockedDisplayInfo.clear();

        assert.deepEqual(
          await ledgerHandler.handle(personalSignRequest),
          signatureResponse,
        );

        assert.equal(calls.signMessage.totalCalls, 5);
        assert.equal(state.connectCount, 3);

        const { messages } = mockedDisplayInfo;

        assert.equal(
          messages.filter((m) => m === "Reconnecting to Ledger...").length,
          2,
        );
        assert.ok(
          messages.some((m) => m.includes("Device is locked")),
          "The locked device should be reported",
        );
        assert.ok(
          messages.some((m) => m.includes("Device not ready")),
          "The busy device should be reported",
        );
      });

      it("should give a disconnected device longer to come back, without asking to plug it in", async () => {
        // Opening the Ethereum app makes the device re-enumerate, which can take
        // longer than a first connection waits for it.
        const [mockedDeviceFactory] = getLedgerDeviceMock({
          getAddress: findAccountAt(derPath),
          signMessage: {
            result: rsv,
            errorSequenceToEmit: [DEVICE_DISCONNECTED_ERROR],
          },
        });

        const timeouts: number[] = [];

        // The first attempt to reconnect finds no device.
        const deviceFactory: LedgerDeviceFactory = async (timeoutMs) => {
          timeouts.push(timeoutMs);

          if (timeouts.length === 2) {
            throw new LedgerNoDeviceFoundError();
          }

          return await mockedDeviceFactory(timeoutMs);
        };

        ledgerHandler = createHandler({
          deviceFactory,
          delayBeforeRetry: noOpSleep,
        });

        mockedDisplayInfo.clear();

        assert.deepEqual(
          await ledgerHandler.handle(personalSignRequest),
          signatureResponse,
        );

        assert.deepEqual(timeouts, [
          LedgerHandler.DEFAULT_TIMEOUT,
          LedgerHandler.RECONNECTION_TIMEOUT,
          LedgerHandler.RECONNECTION_TIMEOUT,
        ]);

        const { messages } = mockedDisplayInfo;

        assert.ok(
          messages.some((m) => m.startsWith("Device did not reconnect.")),
          "The device not coming back should be reported",
        );
        assert.ok(
          !messages.some((m) => m.includes("Device not connected")),
          "The user should not be asked to plug in a device that is connected",
        );
      });
    });

    describe("during path derivation (#derivePath)", () => {
      it("should throw HardhatError.LOCKED_DEVICE after max retries", async () => {
        const [deviceFactory, calls] = getLedgerDeviceMock({
          getAddress: {
            ...findAccountAt(derPath),
            errorSequenceToEmit: new Array(6).fill(DEVICE_LOCKED_ERROR),
          },
        });

        ledgerHandler = createHandler({
          deviceFactory,
          delayBeforeRetry: noOpSleep,
          maxDeviceNotReadyRetries: 5,
        });

        await assertRejectsWithHardhatError(
          () => ledgerHandler.handle(personalSignRequest),
          HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.LOCKED_DEVICE,
          {},
        );

        assert.equal(calls.getAddress.totalCalls, 6);
      });

      it("should handle a disconnection, then a locked device, then a busy device, and succeed", async () => {
        const state = createDeviceFactoryState();
        const [deviceFactory] = getLedgerDeviceMock(
          {
            getAddress: {
              ...findAccountAt(derPath),
              errorSequenceToEmit: [
                DEVICE_DISCONNECTED_ERROR,
                DEVICE_LOCKED_ERROR,
                DEVICE_BUSY_ERROR,
              ],
            },
            signMessage: { result: rsv },
          },
          { state },
        );

        ledgerHandler = createHandler({
          deviceFactory,
          delayBeforeRetry: noOpSleep,
        });

        mockedDisplayInfo.clear();

        assert.deepEqual(
          await ledgerHandler.handle(personalSignRequest),
          signatureResponse,
        );

        assert.equal(state.connectCount, 2);

        const { messages } = mockedDisplayInfo;

        assert.ok(
          messages.includes("Reconnecting to Ledger..."),
          "The reconnection should be displayed",
        );
        assert.ok(
          messages.some((m) => m.includes("Device is locked")),
          "The locked device should be reported",
        );
        assert.ok(
          messages.some((m) => m.includes("Device not ready")),
          "The busy device should be reported",
        );
      });
    });
  });
});
