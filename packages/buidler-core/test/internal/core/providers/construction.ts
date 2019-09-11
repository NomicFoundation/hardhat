import { assert } from "chai";
import Common from "ethereumjs-common";

import { DEFAULT_GAS_MULTIPLIER } from "../../../../../buidler-truffle5/src/constants";
import { ERRORS } from "../../../../src/internal/core/errors";
import {
  createProvider,
  isHDAccountsConfig,
  wrapEthereumProvider
} from "../../../../src/internal/core/providers/construction";
import { GANACHE_GAS_MULTIPLIER } from "../../../../src/internal/core/providers/gas-providers";
import { HttpProvider } from "../../../../src/internal/core/providers/http";
import {
  createChainIdGetter,
  numberToRpcQuantity,
  rpcQuantityToNumber
} from "../../../../src/internal/core/providers/provider-utils";
import { expectBuidlerErrorAsync } from "../../../helpers/errors";

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
    const provider = createProvider("net", { url: "http://localhost:8545" });

    assert.instanceOf(provider, HttpProvider);
  });
});

describe("Base providers wrapping", () => {
  let mockedProvider: MockedProvider;

  beforeEach(() => {
    mockedProvider = new MockedProvider();
    mockedProvider.setReturnValue("web3_clientVersion", "Not ganache");
    mockedProvider.setReturnValue("net_version", "1337");
    mockedProvider.setReturnValue("eth_getBlockByNumber", {
      gasLimit: numberToRpcQuantity(8000000)
    });
    mockedProvider.setReturnValue("eth_accounts", [
      "0x04397ae3f38106cebdf03f963074ecfc23d509d9"
    ]);
  });

  describe("Accounts wrapping", () => {
    it("Should wrap with a list of private keys as accounts", async () => {
      const provider = wrapEthereumProvider(mockedProvider, {
        accounts: [
          "0x5ca14ebaee5e4a48b5341d9225f856115be72df55c7621b73fb0b6a1fdefcf24",
          "0x4e24948ea2bbd95ccd2bac641aadf36acd7e7cc011b1186a83dfe8db6cc7b1ae",
          "0x6dca0836dc90c159b9240aeff471441a134e1b215a7ffe9d69d335f325932665"
        ],
        url: ""
      });

      const accounts = await provider.send("eth_accounts");

      assert.deepEqual(accounts, [
        "0x04397ae3f38106cebdf03f963074ecfc23d509d9",
        "0xa2b6816c50d49101901d93f5302a3a57e0a1281b",
        "0x56b33dc9bd2d34aa087b982f4e307145156f5f9f"
      ]);
    });

    it("Should wrap with an HD wallet provider", async () => {
      const provider = wrapEthereumProvider(mockedProvider, {
        accounts: {
          mnemonic:
            "hurdle method ceiling design federal record unfair cloud end midnight corn oval",
          initialIndex: 3,
          count: 2
        },
        url: ""
      });

      const accounts = await provider.send("eth_accounts");

      assert.deepEqual(accounts, [
        "0xd26a6f43b0df5c539778e08feec29908ea83a1c1",
        "0x70afc7acf880e0d233e8ebedadbdaf68984ff510"
      ]);
    });

    it("Shouldn't wrap with an accounts-managing provider if not necessary", async () => {
      const provider = wrapEthereumProvider(mockedProvider, {
        url: ""
      });

      await provider.send("eth_accounts", ["param1", "param2"]);
      const params = mockedProvider.getLatestParams("eth_accounts");
      assert.deepEqual(params, ["param1", "param2"]);
    });
  });

  describe("Sender wrapping", () => {
    let common: Common;

    beforeEach(async () => {
      mockedProvider.setReturnValue(
        "eth_estimateGas",
        numberToRpcQuantity(123)
      );

      const getChainId = createChainIdGetter(mockedProvider);
      const chainId = await getChainId();
      common = Common.forCustomChain(
        "mainnet",
        {
          chainId,
          networkId: chainId
        },
        "petersburg"
      );
    });

    it("Should wrap with a fixed sender param", async () => {
      const provider = wrapEthereumProvider(mockedProvider, {
        url: "",
        from: "0xa2b6816c50d49101901d93f5302a3a57e0a1281b"
      });

      await provider.send("eth_sendTransaction", [{}]);

      const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");
      assert.equal(tx.from, "0xa2b6816c50d49101901d93f5302a3a57e0a1281b");
    });

    it("Should wrap without a fixed sender param, using the default one", async () => {
      const provider = wrapEthereumProvider(mockedProvider, {
        url: ""
      });

      await provider.send("eth_sendTransaction", [{}]);
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
      const provider = wrapEthereumProvider(mockedProvider, {
        url: "",
        gas: "auto"
      });

      await provider.send("eth_sendTransaction", [{ from: "0x0" }]);
      const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");
      assert.equal(tx.gas, numberToRpcQuantity(123));
    });

    it("Should wrap with an auto gas provider if undefined is used", async () => {
      const provider = wrapEthereumProvider(mockedProvider, {
        url: ""
      });

      await provider.send("eth_sendTransaction", [{ from: "0x0" }]);
      const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");
      assert.equal(
        tx.gas,
        numberToRpcQuantity(Math.floor(123 * DEFAULT_GAS_MULTIPLIER))
      );
    });

    it("Should use the gasMultiplier", async () => {
      const provider = wrapEthereumProvider(mockedProvider, {
        url: "",
        gasMultiplier: OTHER_GAS_MULTIPLIER
      });

      await provider.send("eth_sendTransaction", [{ from: "0x0" }]);
      const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");
      assert.equal(
        tx.gas,
        numberToRpcQuantity(Math.floor(123 * OTHER_GAS_MULTIPLIER))
      );
    });

    it("Should wrap with a fixed gas provider if a number is used", async () => {
      const provider = wrapEthereumProvider(mockedProvider, {
        url: "",
        gas: 678
      });

      await provider.send("eth_sendTransaction", [{ from: "0x0" }]);
      const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");
      assert.equal(tx.gas, numberToRpcQuantity(678));
    });
  });

  describe("Gas price wrapping", () => {
    beforeEach(() => {
      mockedProvider.setReturnValue("eth_gasPrice", numberToRpcQuantity(123));
    });

    it("Should wrap with an auto gas price provider if 'auto' is used", async () => {
      const provider = wrapEthereumProvider(mockedProvider, {
        url: "",
        gasPrice: "auto"
      });

      const gasPrice = await provider.send("eth_gasPrice");
      assert.equal(gasPrice, numberToRpcQuantity(123));
    });

    it("Should wrap with an auto gas price provider if undefined is used", async () => {
      const provider = wrapEthereumProvider(mockedProvider, {
        url: ""
      });

      const gasPrice = await provider.send("eth_gasPrice");
      assert.equal(gasPrice, numberToRpcQuantity(123));
    });

    it("Should wrap with a fixed gas price provider if a number is used", async () => {
      const provider = wrapEthereumProvider(mockedProvider, {
        url: "",
        gasPrice: 789
      });

      await provider.send("eth_sendTransaction", [{}]);
      const [{ gasPrice }] = mockedProvider.getLatestParams(
        "eth_sendTransaction"
      );

      assert.equal(gasPrice, numberToRpcQuantity(789));
    });
  });

  describe("Chain ID wrapping", () => {
    it("Should wrap with a chain id validation provider if a chainId is used", async () => {
      const provider = wrapEthereumProvider(mockedProvider, {
        url: "",
        chainId: 2
      });

      await expectBuidlerErrorAsync(
        () => provider.send("eth_getAccounts", []),
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

      const provider = wrapEthereumProvider(mockedProvider, {
        url: ""
      });

      const estimation = await provider.send("eth_estimateGas", [
        { to: "0xa2b6816c50d49101901d93f5302a3a57e0a1281b", value: 1 }
      ]);

      const gas = rpcQuantityToNumber(estimation);
      assert.equal(gas, Math.floor(123 * GANACHE_GAS_MULTIPLIER));
    });
  });
});
