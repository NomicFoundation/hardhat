import { assert } from "chai";

import {
  defaultHdAccountsConfigParams,
  defaultHttpNetworkParams,
} from "../../../../src/internal/core/config/default-config";
import { ERRORS } from "../../../../src/internal/core/errors-list";
import {
  numberToRpcQuantity,
  rpcQuantityToNumber,
} from "../../../../src/internal/core/jsonrpc/types/base-types";
import { BackwardsCompatibilityProviderAdapter } from "../../../../src/internal/core/providers/backwards-compatibility";
import {
  applyProviderWrappers,
  createProvider,
  isHDAccountsConfig,
} from "../../../../src/internal/core/providers/construction";
import { GANACHE_GAS_MULTIPLIER } from "../../../../src/internal/core/providers/gas-providers";
import { expectHardhatErrorAsync } from "../../../helpers/errors";

import { MockedProvider } from "./mocks";

describe("Network config typeguards", async () => {
  it("Should recognize HDAccountsConfig", () => {
    assert.isTrue(isHDAccountsConfig({ mnemonic: "asdads" } as any));
    assert.isFalse(isHDAccountsConfig({ initialIndex: 1 } as any));
    assert.isFalse(isHDAccountsConfig(undefined));
  });
});

describe("Base provider creation", () => {
  it("Should create a valid HTTP provider and wrap it", () => {
    const provider = createProvider("net", {
      url: "http://localhost:8545",
      ...defaultHttpNetworkParams,
    });

    assert.instanceOf(provider, BackwardsCompatibilityProviderAdapter);
  });
});

describe("Base providers wrapping", () => {
  let mockedProvider: MockedProvider;

  const CHAIN_ID = 1337;

  beforeEach(() => {
    mockedProvider = new MockedProvider();
    mockedProvider.setReturnValue("web3_clientVersion", "Not ganache");
    mockedProvider.setReturnValue("net_version", `${CHAIN_ID}`);
    mockedProvider.setReturnValue("eth_getBlockByNumber", {
      gasLimit: numberToRpcQuantity(8000000),
    });
    mockedProvider.setReturnValue("eth_accounts", [
      "0x04397ae3f38106cebdf03f963074ecfc23d509d9",
    ]);
  });

  describe("Accounts wrapping", () => {
    it("Should wrap with a list of private keys as accounts", async () => {
      const provider = applyProviderWrappers(mockedProvider, {
        accounts: [
          "0x5ca14ebaee5e4a48b5341d9225f856115be72df55c7621b73fb0b6a1fdefcf24",
          "0x4e24948ea2bbd95ccd2bac641aadf36acd7e7cc011b1186a83dfe8db6cc7b1ae",
          "0x6dca0836dc90c159b9240aeff471441a134e1b215a7ffe9d69d335f325932665",
        ],
        url: "",
      });

      const accounts = await provider.request({ method: "eth_accounts" });

      assert.deepEqual(accounts, [
        "0x04397ae3f38106cebdf03f963074ecfc23d509d9",
        "0xa2b6816c50d49101901d93f5302a3a57e0a1281b",
        "0x56b33dc9bd2d34aa087b982f4e307145156f5f9f",
      ]);
    });

    it("Should wrap with an HD wallet provider", async () => {
      const provider = applyProviderWrappers(mockedProvider, {
        accounts: {
          mnemonic:
            "hurdle method ceiling design federal record unfair cloud end midnight corn oval",
          initialIndex: 3,
          count: 2,
          path: defaultHdAccountsConfigParams.path,
        },
        url: "",
      });

      const accounts = await provider.request({ method: "eth_accounts" });

      assert.deepEqual(accounts, [
        "0xd26a6f43b0df5c539778e08feec29908ea83a1c1",
        "0x70afc7acf880e0d233e8ebedadbdaf68984ff510",
      ]);
    });

    it("Shouldn't wrap with an accounts-managing provider if not necessary", async () => {
      const provider = applyProviderWrappers(mockedProvider, {
        url: "",
      });

      await provider.request({
        method: "eth_accounts",
        params: ["param1", "param2"],
      });
      const params = mockedProvider.getLatestParams("eth_accounts");
      assert.deepEqual(params, ["param1", "param2"]);
    });
  });

  describe("Sender wrapping", () => {
    beforeEach(async () => {
      mockedProvider.setReturnValue(
        "eth_estimateGas",
        numberToRpcQuantity(123)
      );

      mockedProvider.setReturnValue("eth_gasPrice", numberToRpcQuantity(12));
    });

    it("Should wrap with a fixed sender param", async () => {
      const provider = applyProviderWrappers(mockedProvider, {
        url: "",
        from: "0xa2b6816c50d49101901d93f5302a3a57e0a1281b",
      });

      await provider.request({ method: "eth_sendTransaction", params: [{}] });

      const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");
      assert.equal(tx.from, "0xa2b6816c50d49101901d93f5302a3a57e0a1281b");
    });

    it("Should wrap without a fixed sender param, using the default one", async () => {
      const provider = applyProviderWrappers(mockedProvider, {
        url: "",
      });

      await provider.request({ method: "eth_sendTransaction", params: [{}] });
      const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");
      assert.equal(tx.from, "0x04397ae3f38106cebdf03f963074ecfc23d509d9");
    });
  });

  describe("Gas wrapping", () => {
    const OTHER_GAS_MULTIPLIER = 1.337;

    beforeEach(() => {
      mockedProvider.setReturnValue(
        "eth_estimateGas",
        numberToRpcQuantity(123)
      );

      mockedProvider.setReturnValue("eth_gasPrice", numberToRpcQuantity(123));
    });

    it("Should wrap with an auto gas provider if 'auto' is used", async () => {
      const provider = applyProviderWrappers(mockedProvider, {
        url: "",
        gas: "auto",
      });

      await provider.request({
        method: "eth_sendTransaction",
        params: [{ from: "0x0" }],
      });
      const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");
      assert.equal(tx.gas, numberToRpcQuantity(123));
    });

    it("Should wrap with an auto gas provider if undefined is used", async () => {
      const provider = applyProviderWrappers(mockedProvider, {
        url: "",
      });

      await provider.request({
        method: "eth_sendTransaction",
        params: [{ from: "0x0" }],
      });
      const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");
      assert.equal(tx.gas, numberToRpcQuantity(123));
    });

    it("Should use the gasMultiplier", async () => {
      const provider = applyProviderWrappers(mockedProvider, {
        url: "",
        gasMultiplier: OTHER_GAS_MULTIPLIER,
      });

      await provider.request({
        method: "eth_sendTransaction",
        params: [{ from: "0x0" }],
      });
      const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");
      assert.equal(
        tx.gas,
        numberToRpcQuantity(Math.floor(123 * OTHER_GAS_MULTIPLIER))
      );
    });

    it("Should wrap with a fixed gas provider if a number is used", async () => {
      const provider = applyProviderWrappers(mockedProvider, {
        url: "",
        gas: 678,
      });

      await provider.request({
        method: "eth_sendTransaction",
        params: [{ from: "0x0" }],
      });
      const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");
      assert.equal(tx.gas, numberToRpcQuantity(678));
    });
  });

  describe("Gas price wrapping", () => {
    beforeEach(() => {
      mockedProvider.setReturnValue("eth_gasPrice", numberToRpcQuantity(123));
    });

    it("Should wrap with an auto gas price provider if 'auto' is used", async () => {
      const provider = applyProviderWrappers(mockedProvider, {
        url: "",
        gasPrice: "auto",
      });

      const gasPrice = await provider.request({ method: "eth_gasPrice" });
      assert.equal(gasPrice, numberToRpcQuantity(123));
    });

    it("Should wrap with an auto gas price provider if undefined is used", async () => {
      const provider = applyProviderWrappers(mockedProvider, {
        url: "",
      });

      const gasPrice = await provider.request({ method: "eth_gasPrice" });
      assert.equal(gasPrice, numberToRpcQuantity(123));
    });

    it("Should wrap with a fixed gas price provider if a number is used", async () => {
      const provider = applyProviderWrappers(mockedProvider, {
        url: "",
        gasPrice: 789,
      });

      await provider.request({ method: "eth_sendTransaction", params: [{}] });
      const [{ gasPrice }] = mockedProvider.getLatestParams(
        "eth_sendTransaction"
      );

      assert.equal(gasPrice, numberToRpcQuantity(789));
    });
  });

  describe("Chain ID wrapping", () => {
    it("Should wrap with a chain id validation provider if a chainId is used", async () => {
      const provider = applyProviderWrappers(mockedProvider, {
        url: "",
        chainId: 2,
      });

      await expectHardhatErrorAsync(
        () => provider.request({ method: "eth_getAccounts", params: [] }),
        ERRORS.NETWORK.INVALID_GLOBAL_CHAIN_ID
      );
    });
  });

  describe("Ganache multiplier provider", () => {
    it("Should wrap with a ganache multiplier provider", async () => {
      mockedProvider.setReturnValue(
        "eth_estimateGas",
        numberToRpcQuantity(123)
      );
      mockedProvider.setReturnValue(
        "web3_clientVersion",
        "EthereumJS TestRPC/v2.5.5/ethereum-js"
      );

      const provider = applyProviderWrappers(mockedProvider, {
        url: "",
      });

      const estimation = (await provider.request({
        method: "eth_estimateGas",
        params: [
          { to: "0xa2b6816c50d49101901d93f5302a3a57e0a1281b", value: 1 },
        ],
      })) as string;

      const gas = rpcQuantityToNumber(estimation);
      assert.equal(gas, Math.floor(123 * GANACHE_GAS_MULTIPLIER));
    });
  });
});
