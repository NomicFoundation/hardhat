import { assert } from "chai";

import { DEFAULT_GAS_MULTIPLIER } from "../../../../src/internal/core/config/default-config";
import {
  numberToRpcQuantity,
  rpcQuantityToNumber,
} from "../../../../src/internal/core/jsonrpc/types/base-types";
import {
  AutomaticGasPriceProvider,
  AutomaticGasProvider,
  FixedGasPriceProvider,
  FixedGasProvider,
  GANACHE_GAS_MULTIPLIER,
  GanacheGasMultiplierProvider,
} from "../../../../src/internal/core/providers/gas-providers";
import { EIP1193Provider } from "../../../../src/types";

import { MockedProvider } from "./mocks";

describe("AutomaticGasProvider", () => {
  const FIXED_GAS_LIMIT = 1231;
  const GAS_MULTIPLIER = 1.337;

  let mockedProvider: MockedProvider;
  let provider: EIP1193Provider;

  beforeEach(() => {
    mockedProvider = new MockedProvider();
    mockedProvider.setReturnValue("eth_getBlockByNumber", {
      gasLimit: numberToRpcQuantity(FIXED_GAS_LIMIT * 1000),
    });
    mockedProvider.setReturnValue(
      "eth_estimateGas",
      numberToRpcQuantity(FIXED_GAS_LIMIT)
    );

    provider = new AutomaticGasProvider(mockedProvider, GAS_MULTIPLIER);
  });

  it("Should estimate gas automatically if not present", async () => {
    await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: "0x0000000000000000000000000000000000000011",
          to: "0x0000000000000000000000000000000000000011",
          value: 1,
        },
      ],
    });

    const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");

    assert.equal(tx.gas, Math.floor(FIXED_GAS_LIMIT * GAS_MULTIPLIER));
  });

  it("Should support different gas multipliers", async () => {
    const GAS_MULTIPLIER2 = 123;
    provider = new AutomaticGasProvider(mockedProvider, GAS_MULTIPLIER2);

    await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: "0x0000000000000000000000000000000000000011",
          to: "0x0000000000000000000000000000000000000011",
          value: 1,
        },
      ],
    });

    const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");

    assert.equal(tx.gas, Math.floor(FIXED_GAS_LIMIT * GAS_MULTIPLIER2));
  });

  it("Should have a default multiplier", async () => {
    provider = new AutomaticGasProvider(mockedProvider);

    await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: "0x0000000000000000000000000000000000000011",
          to: "0x0000000000000000000000000000000000000011",
          value: 1,
        },
      ],
    });

    const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");

    assert.equal(
      rpcQuantityToNumber(tx.gas),
      FIXED_GAS_LIMIT * DEFAULT_GAS_MULTIPLIER
    );
  });

  it("Shouldn't replace the provided gas", async () => {
    await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: "0x0000000000000000000000000000000000000011",
          to: "0x0000000000000000000000000000000000000011",
          value: 1,
          gas: 567,
        },
      ],
    });

    const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");

    assert.equal(tx.gas, 567);
  });

  it("Should forward the other calls", async () => {
    const input = [1, 2, 3];
    await provider.request({ method: "A", params: input });

    const params = mockedProvider.getLatestParams("A");
    assert.deepEqual(params, input);
  });
});

describe("AutomaticGasPriceProvider", () => {
  const FIXED_GAS_PRICE = 1232;
  let provider: EIP1193Provider;
  let mockedProvider: MockedProvider;

  beforeEach(() => {
    mockedProvider = new MockedProvider();
    mockedProvider.setReturnValue(
      "eth_gasPrice",
      numberToRpcQuantity(FIXED_GAS_PRICE)
    );
    provider = new AutomaticGasPriceProvider(mockedProvider);
  });

  it("Should obtain the gas price automatically if not present", async () => {
    await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: "0x0000000000000000000000000000000000000011",
          to: "0x0000000000000000000000000000000000000011",
          value: 1,
        },
      ],
    });

    const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");
    assert.equal(tx.gasPrice, FIXED_GAS_PRICE);
  });

  it("Shouldn't replace the provided gasPrice", async () => {
    await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: "0x0000000000000000000000000000000000000011",
          to: "0x0000000000000000000000000000000000000011",
          value: 1,
          gasPrice: 456,
        },
      ],
    });

    const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");
    assert.equal(tx.gasPrice, 456);
  });

  it("Should forward the other calls", async () => {
    const input = [1, 2, 3, 4];
    await provider.request({ method: "A", params: input });

    const params = mockedProvider.getLatestParams("A");
    assert.deepEqual(params, input);
  });
});

describe("FixedGasProvider", () => {
  const FIXED_GAS_LIMIT = 1233;
  let mockedProvider: MockedProvider;
  let provider: EIP1193Provider;

  const MOCKED_GAS_ESTIMATION_VALUE = {};

  beforeEach(() => {
    mockedProvider = new MockedProvider();
    mockedProvider.setReturnValue(
      "eth_estimateGas",
      MOCKED_GAS_ESTIMATION_VALUE
    );
    provider = new FixedGasProvider(mockedProvider, FIXED_GAS_LIMIT);
  });

  it("Should set the fixed gas if not present", async () => {
    await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: "0x0000000000000000000000000000000000000011",
          to: "0x0000000000000000000000000000000000000011",
          value: 1,
        },
      ],
    });

    const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");
    assert.equal(tx.gas, FIXED_GAS_LIMIT);
  });

  it("Shouldn't replace the provided gas", async () => {
    await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: "0x0000000000000000000000000000000000000011",
          to: "0x0000000000000000000000000000000000000011",
          value: 1,
          gas: 1456,
        },
      ],
    });

    const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");
    assert.equal(tx.gas, 1456);
  });

  it("Should forward direct calls to eth_estimateGas", async () => {
    const estimated = await provider.request({
      method: "eth_estimateGas",
      params: [
        {
          from: "0x0000000000000000000000000000000000000011",
          to: "0x0000000000000000000000000000000000000011",
          value: 1,
          gas: 1456123,
        },
      ],
    });

    assert.equal(estimated, MOCKED_GAS_ESTIMATION_VALUE);
  });

  it("Should forward the other calls", async () => {
    const input = [1, 2, 3, 4, 5];
    await provider.request({ method: "A", params: input });

    const params = mockedProvider.getLatestParams("A");
    assert.deepEqual(params, input);
  });
});

describe("FixedGasPriceProvider", () => {
  const FIXED_GAS_PRICE = 1234;
  let mockedProvider: MockedProvider;
  let provider: EIP1193Provider;

  const MOCKED_GAS_PRICE_VALUE = {};
  beforeEach(() => {
    mockedProvider = new MockedProvider();
    mockedProvider.setReturnValue("eth_gasPrice", MOCKED_GAS_PRICE_VALUE);
    provider = new FixedGasPriceProvider(mockedProvider, FIXED_GAS_PRICE);
  });

  it("Should set the fixed gasPrice if not present", async () => {
    await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: "0x0000000000000000000000000000000000000011",
          to: "0x0000000000000000000000000000000000000011",
          value: 1,
        },
      ],
    });

    const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");
    assert.equal(tx.gasPrice, FIXED_GAS_PRICE);
  });

  it("Shouldn't replace the provided gasPrice", async () => {
    await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: "0x0000000000000000000000000000000000000011",
          to: "0x0000000000000000000000000000000000000011",
          value: 1,
          gasPrice: 14567,
        },
      ],
    });

    const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");
    assert.equal(tx.gasPrice, 14567);
  });

  it("Should forward direct calls to eth_gasPrice", async () => {
    const price = await provider.request({ method: "eth_gasPrice" });

    assert.equal(price, MOCKED_GAS_PRICE_VALUE);
  });

  it("Should forward the other calls", async () => {
    const input = [1, 2, 3, 4, 5, 6];
    await provider.request({ method: "A", params: input });

    const params = mockedProvider.getLatestParams("A");
    assert.deepEqual(params, input);
  });
});

describe("GanacheGasMultiplierProvider", () => {
  it("Should multiply the gas if connected to Ganache", async () => {
    const mockedProvider = new MockedProvider();
    mockedProvider.setReturnValue("eth_estimateGas", numberToRpcQuantity(123));
    mockedProvider.setReturnValue(
      "web3_clientVersion",
      "EthereumJS TestRPC/v2.5.5/ethereum-js"
    );
    mockedProvider.setReturnValue("eth_getBlockByNumber", {
      gasLimit: numberToRpcQuantity(12300000),
    });

    const wrapped = new GanacheGasMultiplierProvider(mockedProvider);

    const estimation = (await wrapped.request({
      method: "eth_estimateGas",
      params: [
        {
          from: "0x0000000000000000000000000000000000000011",
          to: "0x0000000000000000000000000000000000000011",
          value: 1,
        },
      ],
    })) as string;

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
      gasLimit: numberToRpcQuantity(12300000),
    });
    const wrapped = new GanacheGasMultiplierProvider(mockedProvider);

    const estimation = (await wrapped.request({
      method: "eth_estimateGas",
      params: [
        {
          from: "0x0000000000000000000000000000000000000011",
          to: "0x0000000000000000000000000000000000000011",
          value: 1,
        },
      ],
    })) as string;

    const gas = rpcQuantityToNumber(estimation);
    assert.equal(gas, 123);
  });
});
