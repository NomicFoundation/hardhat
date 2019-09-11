import { assert } from "chai";

import { DEFAULT_GAS_MULTIPLIER } from "../../../../../buidler-truffle5/src/constants";
import {
  createAutomaticGasPriceProvider,
  createAutomaticGasProvider,
  createFixedGasPriceProvider,
  createFixedGasProvider,
  createGanacheGasMultiplierProvider,
  GANACHE_GAS_MULTIPLIER
} from "../../../../src/internal/core/providers/gas-providers";
import {
  numberToRpcQuantity,
  rpcQuantityToNumber
} from "../../../../src/internal/core/providers/provider-utils";
import { IEthereumProvider } from "../../../../src/types";

import { MockedProvider } from "./mocks";

describe("createAutomaticGasProvider", () => {
  const FIXED_GAS_LIMIT = 1231;
  const GAS_MULTIPLIER = 1.337;

  let mockedProvider: MockedProvider;
  let provider: IEthereumProvider;

  beforeEach(() => {
    mockedProvider = new MockedProvider();
    mockedProvider.setReturnValue("eth_getBlockByNumber", {
      gasLimit: numberToRpcQuantity(FIXED_GAS_LIMIT * 1000)
    });
    mockedProvider.setReturnValue(
      "eth_estimateGas",
      numberToRpcQuantity(FIXED_GAS_LIMIT)
    );

    provider = createAutomaticGasProvider(mockedProvider, GAS_MULTIPLIER);
  });

  it("Should estimate gas automatically if not present", async () => {
    await provider.send("eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1
      }
    ]);

    const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");

    assert.equal(tx.gas, Math.floor(FIXED_GAS_LIMIT * GAS_MULTIPLIER));
  });

  it("Should support different gas multipliers", async () => {
    const GAS_MULTIPLIER2 = 123;
    provider = createAutomaticGasProvider(mockedProvider, GAS_MULTIPLIER2);

    await provider.send("eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1
      }
    ]);

    const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");

    assert.equal(tx.gas, Math.floor(FIXED_GAS_LIMIT * GAS_MULTIPLIER2));
  });

  it("Should have a default multiplier", async () => {
    provider = createAutomaticGasProvider(mockedProvider);

    await provider.send("eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1
      }
    ]);

    const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");

    assert.equal(
      rpcQuantityToNumber(tx.gas),
      FIXED_GAS_LIMIT * DEFAULT_GAS_MULTIPLIER
    );
  });

  it("Shouldn't replace the provided gas", async () => {
    await provider.send("eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
        gas: 567
      }
    ]);

    const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");

    assert.equal(tx.gas, 567);
  });

  it("Should forward the other calls", async () => {
    const input = [1, 2, 3];
    await provider.send("A", input);

    const params = mockedProvider.getLatestParams("A");
    assert.deepEqual(params, input);
  });
});

describe("createAutomaticGasPriceProvider", () => {
  const FIXED_GAS_PRICE = 1232;
  let provider: IEthereumProvider;
  let mockedProvider: MockedProvider;

  beforeEach(() => {
    mockedProvider = new MockedProvider();
    mockedProvider.setReturnValue(
      "eth_gasPrice",
      numberToRpcQuantity(FIXED_GAS_PRICE)
    );
    provider = createAutomaticGasPriceProvider(mockedProvider);
  });

  it("Should obtain the gas price automatically if not present", async () => {
    await provider.send("eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1
      }
    ]);

    const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");
    assert.equal(tx.gasPrice, FIXED_GAS_PRICE);
  });

  it("Shouldn't replace the provided gasPrice", async () => {
    await provider.send("eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
        gasPrice: 456
      }
    ]);

    const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");
    assert.equal(tx.gasPrice, 456);
  });

  it("Should forward the other calls", async () => {
    const input = [1, 2, 3, 4];
    await provider.send("A", input);

    const params = mockedProvider.getLatestParams("A");
    assert.deepEqual(params, input);
  });
});

describe("createFixedGasProvider", () => {
  const FIXED_GAS_LIMIT = 1233;
  let mockedProvider: MockedProvider;
  let provider: IEthereumProvider;

  const MOCKED_GAS_ESTIMATION_VALUE = {};

  beforeEach(() => {
    mockedProvider = new MockedProvider();
    mockedProvider.setReturnValue(
      "eth_estimateGas",
      MOCKED_GAS_ESTIMATION_VALUE
    );
    provider = createFixedGasProvider(mockedProvider, FIXED_GAS_LIMIT);
  });

  it("Should set the fixed gas if not present", async () => {
    await provider.send("eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1
      }
    ]);

    const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");
    assert.equal(tx.gas, FIXED_GAS_LIMIT);
  });

  it("Shouldn't replace the provided gas", async () => {
    await provider.send("eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
        gas: 1456
      }
    ]);

    const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");
    assert.equal(tx.gas, 1456);
  });

  it("Should forward direct calls to eth_estimateGas", async () => {
    const estimated = await provider.send("eth_estimateGas", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
        gas: 1456123
      }
    ]);

    assert.equal(estimated, MOCKED_GAS_ESTIMATION_VALUE);
  });

  it("Should forward the other calls", async () => {
    const input = [1, 2, 3, 4, 5];
    await provider.send("A", input);

    const params = mockedProvider.getLatestParams("A");
    assert.deepEqual(params, input);
  });
});

describe("createFixedGasPriceProvider", () => {
  const FIXED_GAS_PRICE = 1234;
  let mockedProvider: MockedProvider;
  let provider: IEthereumProvider;

  const MOCKED_GAS_PRICE_VALUE = {};
  beforeEach(() => {
    mockedProvider = new MockedProvider();
    mockedProvider.setReturnValue("eth_gasPrice", MOCKED_GAS_PRICE_VALUE);
    provider = createFixedGasPriceProvider(mockedProvider, FIXED_GAS_PRICE);
  });

  it("Should set the fixed gasPrice if not present", async () => {
    await provider.send("eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1
      }
    ]);

    const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");
    assert.equal(tx.gasPrice, FIXED_GAS_PRICE);
  });

  it("Shouldn't replace the provided gasPrice", async () => {
    await provider.send("eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
        gasPrice: 14567
      }
    ]);

    const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");
    assert.equal(tx.gasPrice, 14567);
  });

  it("Should forward direct calls to eth_gasPrice", async () => {
    const price = await provider.send("eth_gasPrice");

    assert.equal(price, MOCKED_GAS_PRICE_VALUE);
  });

  it("Should forward the other calls", async () => {
    const input = [1, 2, 3, 4, 5, 6];
    await provider.send("A", input);

    const params = mockedProvider.getLatestParams("A");
    assert.deepEqual(params, input);
  });
});

describe("createGanacheGasMultiplierProvider", () => {
  it("Should multiply the gas if connected to Ganache", async () => {
    const mockedProvider = new MockedProvider();
    mockedProvider.setReturnValue("eth_estimateGas", numberToRpcQuantity(123));
    mockedProvider.setReturnValue(
      "web3_clientVersion",
      "EthereumJS TestRPC/v2.5.5/ethereum-js"
    );
    mockedProvider.setReturnValue("eth_getBlockByNumber", {
      gasLimit: numberToRpcQuantity(12300000)
    });

    const wrapped = createGanacheGasMultiplierProvider(mockedProvider);

    const estimation = await wrapped.send("eth_estimateGas", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1
      }
    ]);

    const gas = rpcQuantityToNumber(estimation);
    assert.equal(gas, Math.floor(123 * GANACHE_GAS_MULTIPLIER));
  });

  it("Should not multiply the gas if connected to other node", async () => {
    const mockedProvider = new MockedProvider();
    mockedProvider.setReturnValue("eth_estimateGas", numberToRpcQuantity(123));
    mockedProvider.setReturnValue(
      "web3_clientVersion",
      "Parity-Ethereum//v2.5.1-beta-e0141f8-20190510/x86_64-linux-gnu/rustc1.34.1"
    );
    mockedProvider.setReturnValue("eth_getBlockByNumber", {
      gasLimit: numberToRpcQuantity(12300000)
    });
    const wrapped = createGanacheGasMultiplierProvider(mockedProvider);

    const estimation = await wrapped.send("eth_estimateGas", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1
      }
    ]);

    const gas = rpcQuantityToNumber(estimation);
    assert.equal(gas, 123);
  });
});
