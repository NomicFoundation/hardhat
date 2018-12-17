import { assert } from "chai";

import {
  AutomaticGasProvider,
  FixedGasProvider
} from "../../../src/core/providers/gas-providers";

import { ParamsReturningProvider } from "./mocks";

describe("FixedGasProvider", () => {
  let mockedProvider: ParamsReturningProvider;

  beforeEach(() => {
    mockedProvider = new ParamsReturningProvider();
  });

  describe("With fixed gasLimit and without gasPrice", () => {
    let provider: FixedGasProvider;
    const FIXED_GAS_LIMIT = 123;

    beforeEach(() => {
      provider = new FixedGasProvider(mockedProvider, FIXED_GAS_LIMIT);
    });

    it("should return the fixed gas when estimating", async () => {
      const ret1 = await provider.send("eth_estimateGas", [
        {
          from: "0x0000000000000000000000000000000000000011",
          to: "0x0000000000000000000000000000000000000011",
          gasPrice: 5678,
          value: 1
        }
      ]);

      assert.equal(ret1, FIXED_GAS_LIMIT);

      const ret2 = await provider.send("eth_estimateGas", [
        {
          from: "0x0000000000000000000000000000000000000011",
          to: "0x0000000000000000000000000000000000000011",
          gasPrice: 5678,
          value: 1,
          gas: 78990878
        }
      ]);

      assert.equal(ret1, FIXED_GAS_LIMIT);
    });

    it("Should add gas to a tx if non is present, but not a gasPrice", async () => {
      const [tx] = await provider.send("eth_sendTransaction", [
        {
          from: "0x0000000000000000000000000000000000000011",
          to: "0x0000000000000000000000000000000000000011",
          value: 1
        }
      ]);

      assert.equal(tx.gas, FIXED_GAS_LIMIT);
      assert.isUndefined(tx.gasPrice);
    });

    it("Shouldn't change the gas nor the gasPrice", async () => {
      const [tx] = await provider.send("eth_sendTransaction", [
        {
          from: "0x0000000000000000000000000000000000000011",
          to: "0x0000000000000000000000000000000000000011",
          gasPrice: 5678,
          value: 1,
          gas: 678
        }
      ]);

      assert.equal(tx.gas, 678);
      assert.equal(tx.gasPrice, 5678);
    });

    it("Shouldn't return another gasPrice", async () => {
      const [mockedPrice] = await provider.send("eth_gasPrice", [678]);

      assert.equal(mockedPrice, 678);
    });
  });

  describe("With fixed gasPrice and no gasLimit", () => {
    let provider: FixedGasProvider;
    const FIXED_GAS_PRICE = 123;

    beforeEach(() => {
      provider = new FixedGasProvider(
        mockedProvider,
        undefined,
        FIXED_GAS_PRICE
      );
    });

    it("Shouldn return the fixed gasPrice", async () => {
      const price = await provider.send("eth_gasPrice");

      assert.equal(price, FIXED_GAS_PRICE);
    });

    it("Shouldn't modify the gas estimation", async () => {
      const inputTx = {
        from: "0x0000000000000000000000000000000000000011",
        to: "0x0000000000000000000000000000000000000011",
        gasPrice: 5678,
        value: 1
      };

      const [tx] = await provider.send("eth_estimateGas", [inputTx]);

      assert.deepEqual(tx, inputTx);
    });

    it("Should add a gasPrice and not gas if they are missing", async () => {
      const [tx] = await provider.send("eth_sendTransaction", [
        {
          from: "0x0000000000000000000000000000000000000011",
          to: "0x0000000000000000000000000000000000000011",
          value: 1
        }
      ]);

      assert.equal(tx.gasPrice, FIXED_GAS_PRICE);
      assert.isUndefined(tx.gas);
    });

    it("Shouldn't change the gas nor the gasPrice", async () => {
      const [tx] = await provider.send("eth_sendTransaction", [
        {
          from: "0x0000000000000000000000000000000000000011",
          to: "0x0000000000000000000000000000000000000011",
          gasPrice: 5678,
          value: 1,
          gas: 678
        }
      ]);

      assert.equal(tx.gas, 678);
      assert.equal(tx.gasPrice, 5678);
    });
  });
});

describe("AutomaticGasProvider", () => {
  const FIXED_GAS_LIMIT = 123;
  const FIXED_GAS_PRICE = 678;

  let mockedProvider: ParamsReturningProvider;

  beforeEach(() => {
    mockedProvider = new ParamsReturningProvider();
  });

  describe("With automatic gasLimit and not gasPrice", () => {
    let provider: AutomaticGasProvider;
    let fixedGasProvider: FixedGasProvider;

    beforeEach(() => {
      fixedGasProvider = new FixedGasProvider(mockedProvider, FIXED_GAS_LIMIT);

      provider = new AutomaticGasProvider(fixedGasProvider, true, false);
    });

    it("Should add gas to a tx if non is present, but not a gasPrice", async () => {
      const [tx] = await provider.send("eth_sendTransaction", [
        {
          from: "0x0000000000000000000000000000000000000011",
          to: "0x0000000000000000000000000000000000000011",
          value: 1
        }
      ]);

      assert.equal(tx.gas, FIXED_GAS_LIMIT);
      assert.isUndefined(tx.gasPrice);
    });

    it("Shouldn't change the gas nor the gasPrice", async () => {
      const [tx] = await provider.send("eth_sendTransaction", [
        {
          from: "0x0000000000000000000000000000000000000011",
          to: "0x0000000000000000000000000000000000000011",
          gasPrice: 5678,
          value: 1,
          gas: 678
        }
      ]);

      assert.equal(tx.gas, 678);
      assert.equal(tx.gasPrice, 5678);
    });
  });

  describe("With automatic gasPrice and not gasLimit", () => {
    let provider: AutomaticGasProvider;
    let fixedGasProvider: FixedGasProvider;

    beforeEach(() => {
      fixedGasProvider = new FixedGasProvider(
        mockedProvider,
        undefined,
        FIXED_GAS_PRICE
      );

      provider = new AutomaticGasProvider(fixedGasProvider, false, true);
    });

    it("Should add a gasPrice and not gas if they are missing", async () => {
      const [tx] = await provider.send("eth_sendTransaction", [
        {
          from: "0x0000000000000000000000000000000000000011",
          to: "0x0000000000000000000000000000000000000011",
          value: 1
        }
      ]);

      assert.equal(tx.gasPrice, FIXED_GAS_PRICE);
      assert.isUndefined(tx.gas);
    });

    it("Shouldn't change the gas nor the gasPrice", async () => {
      const [tx] = await provider.send("eth_sendTransaction", [
        {
          from: "0x0000000000000000000000000000000000000011",
          to: "0x0000000000000000000000000000000000000011",
          gasPrice: 5678,
          value: 1,
          gas: 678
        }
      ]);

      assert.equal(tx.gas, 678);
      assert.equal(tx.gasPrice, 5678);
    });
  });
});
