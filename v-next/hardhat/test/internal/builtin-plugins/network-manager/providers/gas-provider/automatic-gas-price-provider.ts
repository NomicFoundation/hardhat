import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";
import { numberToHexString } from "@ignored/hardhat-vnext-utils/hex";

import { AutomaticGasPriceProvider } from "../../../../../../src/internal/builtin-plugins/network-manager/providers/gas-providers/automatic-gas-price-provider.js";
import { createJsonRpcRequest } from "../helpers.js";
import { EthereumMockedProvider } from "../mocked-provider.js";

describe("AutomaticGasPriceProvider", () => {
  let automaticGasPriceProvider: AutomaticGasPriceProvider;
  let mockedProvider: EthereumMockedProvider;

  const FIXED_GAS_PRICE = 1232;

  beforeEach(async () => {
    mockedProvider = new EthereumMockedProvider();

    mockedProvider.setReturnValue(
      "eth_gasPrice",
      numberToHexString(FIXED_GAS_PRICE),
    );

    automaticGasPriceProvider = new AutomaticGasPriceProvider(mockedProvider);
  });

  describe("when the fee price values are provided", function () {
    it("shouldn't replace the provided gasPrice", async () => {
      const jsonRpcRequest = createJsonRpcRequest("eth_sendTransaction", [
        {
          from: "0x0000000000000000000000000000000000000011",
          to: "0x0000000000000000000000000000000000000011",
          value: 1,
          gasPrice: 456,
        },
      ]);

      automaticGasPriceProvider.modifyRequest(jsonRpcRequest);

      assertHardhatInvariant(
        Array.isArray(jsonRpcRequest.params),
        "params should be an array",
      );

      assert.equal(jsonRpcRequest.params[0].gasPrice, 456);
    });

    it("shouldn't replace the provided maxFeePerGas and maxPriorityFeePerGas values", async () => {
      const jsonRpcRequest = createJsonRpcRequest("eth_sendTransaction", [
        {
          from: "0x0000000000000000000000000000000000000011",
          to: "0x0000000000000000000000000000000000000011",
          value: 1,
          maxFeePerGas: 456,
          maxPriorityFeePerGas: 789,
        },
      ]);

      automaticGasPriceProvider.modifyRequest(jsonRpcRequest);

      assertHardhatInvariant(
        Array.isArray(jsonRpcRequest.params),
        "params should be an array",
      );

      assert.equal(jsonRpcRequest.params[0].maxFeePerGas, 456);
      assert.equal(jsonRpcRequest.params[0].maxPriorityFeePerGas, 789);
    });
  });

  describe("Default fee price values", function () {
    describe("When eth_feeHistory is available and EIP1559 is supported", function () {
      const latestBaseFeeInMockedProvider = 80;

      beforeEach(function () {
        mockedProvider.setReturnValue("eth_feeHistory", {
          baseFeePerGas: [
            numberToHexString(latestBaseFeeInMockedProvider),
            numberToHexString(
              Math.floor((latestBaseFeeInMockedProvider * 9) / 8),
            ),
          ],
          reward: [["0x4"]],
        });

        mockedProvider.setReturnValue("eth_getBlockByNumber", {
          baseFeePerGas: "0x1",
        });
      });

      it("should use the reward return value as default maxPriorityFeePerGas", async function () {
        const jsonRpcRequest = createJsonRpcRequest("eth_sendTransaction", [
          {
            from: "0x0000000000000000000000000000000000000011",
            to: "0x0000000000000000000000000000000000000011",
            value: 1,
            maxFeePerGas: "0x99",
          },
        ]);

        await automaticGasPriceProvider.modifyRequest(jsonRpcRequest);

        assertHardhatInvariant(
          Array.isArray(jsonRpcRequest.params),
          "params should be an array",
        );

        assert.equal(jsonRpcRequest.params[0].maxPriorityFeePerGas, "0x4");
        assert.equal(jsonRpcRequest.params[0].maxFeePerGas, "0x99");
      });

      it("should add the reward to the maxFeePerGas if not big enough", async function () {
        const jsonRpcRequest = createJsonRpcRequest("eth_sendTransaction", [
          {
            from: "0x0000000000000000000000000000000000000011",
            to: "0x0000000000000000000000000000000000000011",
            value: 1,
            maxFeePerGas: "0x1",
          },
        ]);

        await automaticGasPriceProvider.modifyRequest(jsonRpcRequest);

        assertHardhatInvariant(
          Array.isArray(jsonRpcRequest.params),
          "params should be an array",
        );

        assert.equal(jsonRpcRequest.params[0].maxPriorityFeePerGas, "0x4");
        assert.equal(jsonRpcRequest.params[0].maxFeePerGas, "0x5");
      });

      it("should use the expected max base fee of N blocks in the future if maxFeePerGas is missing", async function () {
        const jsonRpcRequest = createJsonRpcRequest("eth_sendTransaction", [
          {
            from: "0x0000000000000000000000000000000000000011",
            to: "0x0000000000000000000000000000000000000011",
            value: 1,
            maxPriorityFeePerGas: "0x1",
          },
        ]);

        const expectedBaseFee = Math.floor(
          latestBaseFeeInMockedProvider *
            (9 / 8) **
              Number(
                AutomaticGasPriceProvider.EIP1559_BASE_FEE_MAX_FULL_BLOCKS_PREFERENCE,
              ),
        );

        await automaticGasPriceProvider.modifyRequest(jsonRpcRequest);

        assertHardhatInvariant(
          Array.isArray(jsonRpcRequest.params),
          "params should be an array",
        );

        assert.equal(jsonRpcRequest.params[0].maxPriorityFeePerGas, "0x1");
        assert.equal(
          jsonRpcRequest.params[0].maxFeePerGas,
          numberToHexString(expectedBaseFee),
        );
      });
    });

    describe("when the eth_feeHistory result causes maxPriorityFeePerGas to be 0 and eth_maxPriorityFeePerGas doesn't exist", function () {
      const latestBaseFeeInMockedProvider = 80;

      beforeEach(function () {
        mockedProvider.setReturnValue("eth_feeHistory", {
          baseFeePerGas: [
            numberToHexString(latestBaseFeeInMockedProvider),
            numberToHexString(
              Math.floor((latestBaseFeeInMockedProvider * 9) / 8),
            ),
          ],
          reward: [["0x0"]],
        });

        mockedProvider.setReturnValue("eth_getBlockByNumber", {
          baseFeePerGas: "0x1",
        });
      });

      it("should use a non-zero maxPriorityFeePerGas", async function () {
        const jsonRpcRequest = createJsonRpcRequest("eth_sendTransaction", [
          {
            from: "0x0000000000000000000000000000000000000011",
            to: "0x0000000000000000000000000000000000000011",
            value: 1,
          },
        ]);

        const expectedBaseFee = Math.floor(
          latestBaseFeeInMockedProvider *
            (9 / 8) **
              Number(
                AutomaticGasPriceProvider.EIP1559_BASE_FEE_MAX_FULL_BLOCKS_PREFERENCE,
              ),
        );

        await automaticGasPriceProvider.modifyRequest(jsonRpcRequest);

        assertHardhatInvariant(
          Array.isArray(jsonRpcRequest.params),
          "params should be an array",
        );

        assert.equal(jsonRpcRequest.params[0].maxPriorityFeePerGas, "0x1");
        assert.equal(
          jsonRpcRequest.params[0].maxFeePerGas,
          numberToHexString(expectedBaseFee),
        );
      });
    });

    describe("when the eth_feeHistory result causes maxPriorityFeePerGas to be 0 and eth_maxPriorityFeePerGas exists", function () {
      const latestBaseFeeInMockedProvider = 80;

      beforeEach(function () {
        mockedProvider.setReturnValue("eth_feeHistory", {
          baseFeePerGas: [
            numberToHexString(latestBaseFeeInMockedProvider),
            numberToHexString(
              Math.floor((latestBaseFeeInMockedProvider * 9) / 8),
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
        const jsonRpcRequest = createJsonRpcRequest("eth_sendTransaction", [
          {
            from: "0x0000000000000000000000000000000000000011",
            to: "0x0000000000000000000000000000000000000011",
            value: 1,
          },
        ]);

        const expectedBaseFee = Math.floor(
          latestBaseFeeInMockedProvider *
            (9 / 8) **
              Number(
                AutomaticGasPriceProvider.EIP1559_BASE_FEE_MAX_FULL_BLOCKS_PREFERENCE,
              ),
        );

        await automaticGasPriceProvider.modifyRequest(jsonRpcRequest);

        assertHardhatInvariant(
          Array.isArray(jsonRpcRequest.params),
          "params should be an array",
        );

        assert.equal(jsonRpcRequest.params[0].maxPriorityFeePerGas, "0x12");
        assert.equal(
          jsonRpcRequest.params[0].maxFeePerGas,
          numberToHexString(expectedBaseFee),
        );
      });
    });

    describe("when eth_feeHistory is available and EIP1559 is not supported", function () {
      const latestBaseFeeInMockedProvider = 80;

      beforeEach(function () {
        mockedProvider.setReturnValue("eth_feeHistory", {
          baseFeePerGas: [
            numberToHexString(latestBaseFeeInMockedProvider),
            numberToHexString(
              Math.floor((latestBaseFeeInMockedProvider * 9) / 8),
            ),
          ],
          reward: [["0x4"]],
        });

        mockedProvider.setReturnValue("eth_getBlockByNumber", {});
      });

      runTestUseLegacyGasPrice();
    });

    describe("when eth_feeHistory is not available", function () {
      beforeEach(function () {
        mockedProvider.setReturnValue("eth_getBlockByNumber", {});
      });

      runTestUseLegacyGasPrice();
    });

    /**
     * Group of tests that expect gasPrice to be used instead of EIP1559 fields
     */
    function runTestUseLegacyGasPrice() {
      it("should use gasPrice when nothing is provided", async function () {
        const jsonRpcRequest = createJsonRpcRequest("eth_sendTransaction", [
          {
            from: "0x0000000000000000000000000000000000000011",
            to: "0x0000000000000000000000000000000000000011",
            value: 1,
          },
        ]);

        await automaticGasPriceProvider.modifyRequest(jsonRpcRequest);

        assertHardhatInvariant(
          Array.isArray(jsonRpcRequest.params),
          "params should be an array",
        );

        assert.equal(
          jsonRpcRequest.params[0].gasPrice,
          numberToHexString(FIXED_GAS_PRICE),
        );
      });

      it("should use gasPrice as default maxPriorityFeePerGas, adding it to maxFeePerGas if necessary", async function () {
        const jsonRpcRequest = createJsonRpcRequest("eth_sendTransaction", [
          {
            from: "0x0000000000000000000000000000000000000011",
            to: "0x0000000000000000000000000000000000000011",
            value: 1,
            maxFeePerGas: "0x1",
          },
        ]);

        await automaticGasPriceProvider.modifyRequest(jsonRpcRequest);

        assertHardhatInvariant(
          Array.isArray(jsonRpcRequest.params),
          "params should be an array",
        );

        assert.equal(
          jsonRpcRequest.params[0].maxPriorityFeePerGas,
          numberToHexString(FIXED_GAS_PRICE),
        );
        assert.equal(
          jsonRpcRequest.params[0].maxFeePerGas,
          numberToHexString(FIXED_GAS_PRICE + 1),
        );
      });

      it("should use gasPrice as default maxFeePerGas, fixing maxPriorityFee to it if necessary", async function () {
        const jsonRpcRequest = createJsonRpcRequest("eth_sendTransaction", [
          {
            from: "0x0000000000000000000000000000000000000011",
            to: "0x0000000000000000000000000000000000000011",
            value: 1,
            maxPriorityFeePerGas: numberToHexString(FIXED_GAS_PRICE + 2),
          },
        ]);

        await automaticGasPriceProvider.modifyRequest(jsonRpcRequest);

        assertHardhatInvariant(
          Array.isArray(jsonRpcRequest.params),
          "params should be an array",
        );

        assert.equal(
          jsonRpcRequest.params[0].maxPriorityFeePerGas,
          numberToHexString(FIXED_GAS_PRICE + 2),
        );
        assert.equal(
          jsonRpcRequest.params[0].maxFeePerGas,
          numberToHexString(FIXED_GAS_PRICE * 2 + 2),
        );
      });
    }
  });

  it("should forward the other calls", async () => {
    const jsonRpcRequest = createJsonRpcRequest(
      "eth_getBlockByNumber",
      [1, 2, 3, 4],
    );

    await automaticGasPriceProvider.modifyRequest(jsonRpcRequest);

    assertHardhatInvariant(
      Array.isArray(jsonRpcRequest.params),
      "params should be an array",
    );

    assert.deepEqual(jsonRpcRequest.params, [1, 2, 3, 4]);
  });
});
