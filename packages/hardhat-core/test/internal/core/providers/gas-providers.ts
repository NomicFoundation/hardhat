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

    assert.strictEqual(tx.gas, Math.floor(FIXED_GAS_LIMIT * GAS_MULTIPLIER));
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

    assert.strictEqual(tx.gas, Math.floor(FIXED_GAS_LIMIT * GAS_MULTIPLIER2));
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

    assert.strictEqual(
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

    assert.strictEqual(tx.gas, 567);
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

  describe("When the fee price values are provided", function () {
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
      assert.strictEqual(tx.gasPrice, 456);
    });

    it("Shouldn't replace the provided maxFeePerGas and maxPriorityFeePerGas values", async () => {
      await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: "0x0000000000000000000000000000000000000011",
            to: "0x0000000000000000000000000000000000000011",
            value: 1,
            maxFeePerGas: 456,
            maxPriorityFeePerGas: 789,
          },
        ],
      });

      const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");
      assert.strictEqual(tx.maxFeePerGas, 456);
      assert.strictEqual(tx.maxPriorityFeePerGas, 789);
    });
  });

  describe("Default fee price values", function () {
    describe("When eth_feeHistory is available and EIP1559 is supported", function () {
      const latestBaseFeeInMockedProvider = 80;

      beforeEach(function () {
        mockedProvider.setReturnValue("eth_feeHistory", {
          baseFeePerGas: [
            numberToRpcQuantity(latestBaseFeeInMockedProvider),
            numberToRpcQuantity(
              Math.floor((latestBaseFeeInMockedProvider * 9) / 8)
            ),
          ],
          reward: [["0x4"]],
        });

        mockedProvider.setReturnValue("eth_getBlockByNumber", {
          baseFeePerGas: "0x1",
        });
      });

      it("should use the reward return value as default maxPriorityFeePerGas", async function () {
        await provider.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: "0x0000000000000000000000000000000000000011",
              to: "0x0000000000000000000000000000000000000011",
              value: 1,
              maxFeePerGas: "0x99",
            },
          ],
        });

        const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");
        assert.strictEqual(tx.maxPriorityFeePerGas, "0x4");
        assert.strictEqual(tx.maxFeePerGas, "0x99");
      });

      it("Should add the reward to the maxFeePerGas if not big enough", async function () {
        await provider.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: "0x0000000000000000000000000000000000000011",
              to: "0x0000000000000000000000000000000000000011",
              value: 1,
              maxFeePerGas: "0x1",
            },
          ],
        });

        const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");
        assert.strictEqual(tx.maxPriorityFeePerGas, "0x4");
        assert.strictEqual(tx.maxFeePerGas, "0x5");
      });

      it("Should use the expected max base fee of N blocks in the future if maxFeePerGas is missing", async function () {
        await provider.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: "0x0000000000000000000000000000000000000011",
              to: "0x0000000000000000000000000000000000000011",
              value: 1,
              maxPriorityFeePerGas: "0x1",
            },
          ],
        });

        const expectedBaseFee = Math.floor(
          latestBaseFeeInMockedProvider *
            (9 / 8) **
              Number(
                AutomaticGasPriceProvider.EIP1559_BASE_FEE_MAX_FULL_BLOCKS_PREFERENCE
              )
        );

        const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");
        assert.strictEqual(tx.maxPriorityFeePerGas, "0x1");
        assert.strictEqual(tx.maxFeePerGas, numberToRpcQuantity(expectedBaseFee));
      });
    });

    describe("When the eth_feeHistory result causes maxPriorityFeePerGas to be 0 and eth_maxPriorityFeePerGas doesn't exist", function () {
      const latestBaseFeeInMockedProvider = 80;

      beforeEach(function () {
        mockedProvider.setReturnValue("eth_feeHistory", {
          baseFeePerGas: [
            numberToRpcQuantity(latestBaseFeeInMockedProvider),
            numberToRpcQuantity(
              Math.floor((latestBaseFeeInMockedProvider * 9) / 8)
            ),
          ],
          reward: [["0x0"]],
        });

        mockedProvider.setReturnValue("eth_getBlockByNumber", {
          baseFeePerGas: "0x1",
        });
      });

      it("should use a non-zero maxPriorityFeePerGas", async function () {
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

        const expectedBaseFee = Math.floor(
          latestBaseFeeInMockedProvider *
            (9 / 8) **
              Number(
                AutomaticGasPriceProvider.EIP1559_BASE_FEE_MAX_FULL_BLOCKS_PREFERENCE
              )
        );

        const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");
        assert.strictEqual(tx.maxFeePerGas, expectedBaseFee);
        assert.strictEqual(tx.maxPriorityFeePerGas, "0x1");
      });
    });

    describe("When the eth_feeHistory result causes maxPriorityFeePerGas to be 0 and eth_maxPriorityFeePerGas exists", function () {
      const latestBaseFeeInMockedProvider = 80;

      beforeEach(function () {
        mockedProvider.setReturnValue("eth_feeHistory", {
          baseFeePerGas: [
            numberToRpcQuantity(latestBaseFeeInMockedProvider),
            numberToRpcQuantity(
              Math.floor((latestBaseFeeInMockedProvider * 9) / 8)
            ),
          ],
          reward: [["0x0"]],
        });

        mockedProvider.setReturnValue("eth_getBlockByNumber", {
          baseFeePerGas: "0x1",
        });

        mockedProvider.setReturnValue("eth_maxPriorityFeePerGas", "0x12");
      });

      it("should use the result of eth_maxPriorityFeePerGas as maxPriorityFeePerGas", async function () {
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

        const expectedBaseFee = Math.floor(
          latestBaseFeeInMockedProvider *
            (9 / 8) **
              Number(
                AutomaticGasPriceProvider.EIP1559_BASE_FEE_MAX_FULL_BLOCKS_PREFERENCE
              )
        );

        const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");
        assert.strictEqual(tx.maxFeePerGas, expectedBaseFee);
        assert.strictEqual(tx.maxPriorityFeePerGas, "0x12");
      });
    });

    describe("When eth_feeHistory is available and EIP1559 is not supported", function () {
      const latestBaseFeeInMockedProvider = 80;

      beforeEach(function () {
        mockedProvider.setReturnValue("eth_feeHistory", {
          baseFeePerGas: [
            numberToRpcQuantity(latestBaseFeeInMockedProvider),
            numberToRpcQuantity(
              Math.floor((latestBaseFeeInMockedProvider * 9) / 8)
            ),
          ],
          reward: [["0x4"]],
        });

        mockedProvider.setReturnValue("eth_getBlockByNumber", {});
      });

      runTestUseLegacyGasPrice();
    });

    describe("When eth_feeHistory is not available", function () {
      beforeEach(function () {
        mockedProvider.setReturnValue("eth_getBlockByNumber", {});
      });

      runTestUseLegacyGasPrice();
    });

    /**
     * Group of tests that expect gasPrice to be used instead of EIP1559 fields
     */
    function runTestUseLegacyGasPrice() {
      it("Should use gasPrice when nothing is provided", async function () {
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
        assert.strictEqual(tx.gasPrice, FIXED_GAS_PRICE);
      });

      it("Should use gasPrice as default maxPriorityFeePerGas, adding it to maxFeePerGas if necessary", async function () {
        await provider.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: "0x0000000000000000000000000000000000000011",
              to: "0x0000000000000000000000000000000000000011",
              value: 1,
              maxFeePerGas: "0x1",
            },
          ],
        });

        const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");
        assert.strictEqual(
          tx.maxPriorityFeePerGas,
          numberToRpcQuantity(FIXED_GAS_PRICE)
        );
        assert.strictEqual(tx.maxFeePerGas, numberToRpcQuantity(FIXED_GAS_PRICE + 1));
      });

      it("Should use gasPrice as default maxFeePerGas, fixing maxPriorityFee to it if necessary", async function () {
        await provider.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: "0x0000000000000000000000000000000000000011",
              to: "0x0000000000000000000000000000000000000011",
              value: 1,
              maxPriorityFeePerGas: numberToRpcQuantity(FIXED_GAS_PRICE + 2),
            },
          ],
        });

        const [tx] = mockedProvider.getLatestParams("eth_sendTransaction");
        assert.strictEqual(
          tx.maxPriorityFeePerGas,
          numberToRpcQuantity(FIXED_GAS_PRICE + 2)
        );
        assert.strictEqual(
          tx.maxFeePerGas,
          numberToRpcQuantity(FIXED_GAS_PRICE * 2 + 2)
        );
      });
    }
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
    assert.strictEqual(tx.gas, FIXED_GAS_LIMIT);
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
    assert.strictEqual(tx.gas, 1456);
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

    assert.strictEqual(estimated, MOCKED_GAS_ESTIMATION_VALUE);
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
    assert.strictEqual(tx.gasPrice, FIXED_GAS_PRICE);
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
    assert.strictEqual(tx.gasPrice, 14567);
  });

  it("Should forward direct calls to eth_gasPrice", async () => {
    const price = await provider.request({ method: "eth_gasPrice" });

    assert.strictEqual(price, MOCKED_GAS_PRICE_VALUE);
  });

  it("Should forward the other calls", async () => {
    const input = [1, 2, 3, 4, 5, 6];
    await provider.request({ method: "A", params: input });

    const params = mockedProvider.getLatestParams("A");
    assert.deepEqual(params, input);
  });
});
