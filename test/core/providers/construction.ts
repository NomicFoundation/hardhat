import { assert } from "chai";
import Tx from "ethereumjs-tx";
import { HttpProvider } from "web3x/providers";
import { bufferToHex } from "web3x/utils";

import { ERRORS } from "../../../src/core/errors";
import { createLocalAccountsProvider } from "../../../src/core/providers/accounts";
import {
  createProvider,
  isHDAccountsConfig,
  wrapEthereumProvider
} from "../../../src/core/providers/construction";
import { IEthereumProvider } from "../../../src/core/providers/ethereum";
import {
  createFixedGasPriceProvider,
  createFixedGasProvider
} from "../../../src/core/providers/gas-providers";
import { expectBuidlerError, expectErrorAsync } from "../../helpers/errors";

import { ParamsReturningProvider } from "./mocks";

describe("Network config typeguards", async () => {
  it("Should recognize HDAccountsConfig", () => {
    assert.isTrue(isHDAccountsConfig({ mnemonic: "asdads" } as any));
    assert.isFalse(isHDAccountsConfig({ initialIndex: 1 } as any));
    assert.isFalse(isHDAccountsConfig(undefined));
  });
});

describe("Base provider creation", () => {
  it("Should fail if trying to use auto network", () => {
    assert.throws(() => createProvider("auto"));
  });

  it("Should create a valid HTTP provider and wrap it", () => {
    const provider = createProvider("asd", { asd: { url: "asdads" } });

    assert.instanceOf(provider, HttpProvider);
  });

  it("Should set a default url if none is given", () => {
    const provider: any = createProvider("asd", { asd: {} });
    assert.equal(provider.provider.host, "http://localhost:8545");
  });

  it("should fail on getting non existent network config", () => {
    expectBuidlerError(() => {
      createProvider("asd", {});
    }, ERRORS.NETWORK_CONFIG_NOT_FOUND);
  });

  it("should fail if no networks config is provided", () => {
    expectBuidlerError(() => {
      createProvider("asd");
    }, ERRORS.NETWORK_CONFIG_NOT_FOUND);
  });
});

describe("Base providers wrapping", () => {
  let baseProvider: IEthereumProvider;

  beforeEach(() => {
    baseProvider = new ParamsReturningProvider();
  });

  describe("Accounts wrapping", () => {
    it("Should wrap with a list of private keys as accounts", async () => {
      const provider = wrapEthereumProvider(baseProvider, {
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
      const provider = wrapEthereumProvider(baseProvider, {
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
      const provider = wrapEthereumProvider(baseProvider, {
        url: ""
      });

      const accounts = await provider.send("eth_accounts", [
        "param1",
        "param2"
      ]);

      assert.deepEqual(accounts, ["param1", "param2"]);
    });
  });

  describe("Sender wrapping", () => {
    beforeEach(() => {
      baseProvider = createLocalAccountsProvider(baseProvider, [
        "0x5ca14ebaee5e4a48b5341d9225f856115be72df55c7621b73fb0b6a1fdefcf24",
        "0x4e24948ea2bbd95ccd2bac641aadf36acd7e7cc011b1186a83dfe8db6cc7b1ae",
        "0x6dca0836dc90c159b9240aeff471441a134e1b215a7ffe9d69d335f325932665"
      ]);
    });

    it("Should wrap with a fixed sender param", async () => {
      const provider = wrapEthereumProvider(baseProvider, {
        url: "",
        from: "0xa2b6816c50d49101901d93f5302a3a57e0a1281b"
      });

      const [rawTx] = await provider.send("eth_sendTransaction", [{}]);

      const tx = new Tx(rawTx);
      assert.equal(
        bufferToHex(tx.from),
        "0xa2b6816c50d49101901d93f5302a3a57e0a1281b"
      );
    });

    it("Should wrap without a fixed sender param, using the default one", async () => {
      const provider = wrapEthereumProvider(baseProvider, {
        url: ""
      });

      const [rawTx] = await provider.send("eth_sendTransaction", [{}]);

      const tx = new Tx(rawTx);
      assert.equal(
        bufferToHex(tx.from),
        "0x04397ae3f38106cebdf03f963074ecfc23d509d9"
      );
    });
  });

  describe("Gas wrapping", () => {
    beforeEach(() => {
      baseProvider = createFixedGasProvider(baseProvider, 123);
    });

    it("Should wrap with an auto gas provider if 'auto' is used", async () => {
      const provider = wrapEthereumProvider(baseProvider, {
        url: "",
        gas: "auto"
      });

      const [tx] = await provider.send("eth_sendTransaction", [
        { from: "0x0" }
      ]);
      assert.equal(tx.gas, 123);
    });

    it("Should wrap with an auto gas provider if undefined is used", async () => {
      const provider = wrapEthereumProvider(baseProvider, {
        url: ""
      });

      const [tx] = await provider.send("eth_sendTransaction", [
        { from: "0x0" }
      ]);
      assert.equal(tx.gas, 123);
    });

    it("Should wrap with a fixed gas provider if a number is used", async () => {
      const provider = wrapEthereumProvider(baseProvider, {
        url: "",
        gas: 678
      });

      const [tx] = await provider.send("eth_sendTransaction", [
        { from: "0x0" }
      ]);
      assert.equal(tx.gas, 678);
    });
  });

  describe("Gas price wrapping", () => {
    beforeEach(() => {
      baseProvider = createFixedGasPriceProvider(baseProvider, 123);
    });

    it("Should wrap with an auto gas price provider if 'auto' is used", async () => {
      const provider = wrapEthereumProvider(baseProvider, {
        url: "",
        gasPrice: "auto"
      });

      const gasPrice = await provider.send("eth_gasPrice");
      assert.equal(gasPrice, 123);
    });

    it("Should wrap with an auto gas price provider if undefined is used", async () => {
      const provider = wrapEthereumProvider(baseProvider, {
        url: ""
      });

      const gasPrice = await provider.send("eth_gasPrice");
      assert.equal(gasPrice, 123);
    });

    it("Should wrap with a fixed gas price provider if a number is used", async () => {
      const provider = wrapEthereumProvider(baseProvider, {
        url: "",
        gasPrice: 789
      });

      const gasPrice = await provider.send("eth_gasPrice");
      assert.equal(gasPrice, 789);
    });
  });

  describe("Chain ID wrapping", () => {
    it("Should wrap with a chain id validation provider if no chainId is used", async () => {
      const provider = wrapEthereumProvider(baseProvider, {
        url: ""
      });

      await expectErrorAsync(
        () =>
          provider.send("eth_sendTransaction", [{ from: "0x0", chainId: 1 }]),
        "chainIds don't match"
      );
    });

    it("Should wrap with a chain id validation provider if a chainId is used", async () => {
      const provider = wrapEthereumProvider(baseProvider, {
        url: "",
        chainId: 2
      });

      await expectErrorAsync(
        () =>
          provider.send("eth_sendTransaction", [{ from: "0x0", chainId: 1 }]),
        "chainIds don't match"
      );
    });
  });
});
