import { assert } from "chai";

import {
  createAutomaticGasPriceProvider,
  createAutomaticGasProvider,
  createFixedGasPriceProvider,
  createFixedGasProvider
} from "../../../src/core/providers/gas-providers";
import { IEthereumProvider } from "../../../src/types";

import { ParamsReturningProvider } from "./mocks";

describe("createAutomaticGasProvider", () => {
  const FIXED_GAS_LIMIT = 1231;
  let provider: IEthereumProvider;

  beforeEach(() => {
    const mockedProvider = new ParamsReturningProvider();
    const fixedGasProvider = createFixedGasProvider(
      mockedProvider,
      FIXED_GAS_LIMIT
    );
    provider = createAutomaticGasProvider(fixedGasProvider);
  });

  it("Should estimate gas automatically if not present", async () => {
    const [tx] = await provider.send("eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1
      }
    ]);

    assert.equal(tx.gas, FIXED_GAS_LIMIT);
  });

  it("Shouldn't replace the provided gas", async () => {
    const [tx] = await provider.send("eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
        gas: 567
      }
    ]);

    assert.equal(tx.gas, 567);
  });

  it("Should forward the other calls", async () => {
    const input = [1, 2, 3];
    const returned = await provider.send("A", input);

    assert.deepEqual(returned, input);
  });
});

describe("createAutomaticGasPriceProvider", () => {
  const FIXED_GAS_PRICE = 1232;
  let provider: IEthereumProvider;

  beforeEach(() => {
    const mockedProvider = new ParamsReturningProvider();
    const fixedGasProvider = createFixedGasPriceProvider(
      mockedProvider,
      FIXED_GAS_PRICE
    );
    provider = createAutomaticGasPriceProvider(fixedGasProvider);
  });

  it("Should obtain the gas price automatically if not present", async () => {
    const [tx] = await provider.send("eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1
      }
    ]);

    assert.equal(tx.gasPrice, FIXED_GAS_PRICE);
  });

  it("Shouldn't replace the provided gasPrice", async () => {
    const [tx] = await provider.send("eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
        gasPrice: 456
      }
    ]);

    assert.equal(tx.gasPrice, 456);
  });

  it("Should forward the other calls", async () => {
    const input = [1, 2, 3, 4];
    const returned = await provider.send("A", input);

    assert.deepEqual(returned, input);
  });
});

describe("createFixedGasProvider", () => {
  const FIXED_GAS_LIMIT = 1233;
  let provider: IEthereumProvider;

  beforeEach(() => {
    const mockedProvider = new ParamsReturningProvider();
    provider = createFixedGasProvider(mockedProvider, FIXED_GAS_LIMIT);
  });

  it("Should set the fixed gas if not present", async () => {
    const [tx] = await provider.send("eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1
      }
    ]);

    assert.equal(tx.gas, FIXED_GAS_LIMIT);
  });

  it("Shouldn't replace the provided gas", async () => {
    const [tx] = await provider.send("eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
        gas: 1456
      }
    ]);

    assert.equal(tx.gas, 1456);
  });

  it("Should return the fixed gas when estimating", async () => {
    const estimated = await provider.send("eth_estimateGas", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
        gas: 1456123
      }
    ]);

    assert.equal(estimated, FIXED_GAS_LIMIT);
  });

  it("Should forward the other calls", async () => {
    const input = [1, 2, 3, 4, 5];
    const returned = await provider.send("A", input);

    assert.deepEqual(returned, input);
  });
});

describe("createFixedGasPriceProvider", () => {
  const FIXED_GAS_PRICE = 1234;
  let provider: IEthereumProvider;

  beforeEach(() => {
    const mockedProvider = new ParamsReturningProvider();
    provider = createFixedGasPriceProvider(mockedProvider, FIXED_GAS_PRICE);
  });

  it("Should set the fixed gasPrice if not present", async () => {
    const [tx] = await provider.send("eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1
      }
    ]);

    assert.equal(tx.gasPrice, FIXED_GAS_PRICE);
  });

  it("Shouldn't replace the provided gasPrice", async () => {
    const [tx] = await provider.send("eth_sendTransaction", [
      {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        value: 1,
        gasPrice: 14567
      }
    ]);

    assert.equal(tx.gasPrice, 14567);
  });

  it("Should return the fixed gas price when requested", async () => {
    const price = await provider.send("eth_gasPrice");

    assert.equal(price, FIXED_GAS_PRICE);
  });

  it("Should forward the other calls", async () => {
    const input = [1, 2, 3, 4, 5, 6];
    const returned = await provider.send("A", input);

    assert.deepEqual(returned, input);
  });
});
