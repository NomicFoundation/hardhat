import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { numberToHexString } from "@ignored/hardhat-vnext-utils/hex";

import {
  getJsonRpcRequest,
  getRequestParams,
} from "../../../../../../../src/internal/builtin-plugins/network-manager/json-rpc.js";
import { AutomaticGasPriceHandler } from "../../../../../../../src/internal/builtin-plugins/network-manager/request-handlers/handlers/gas/automatic-gas-price-handler.js";
import { EthereumMockedProvider } from "../../ethereum-mocked-provider.js";

describe("AutomaticGasPriceHandler", () => {
  let automaticGasPriceHandler: AutomaticGasPriceHandler;
  let mockedProvider: EthereumMockedProvider;

  const FIXED_GAS_PRICE = 1232;

  beforeEach(async () => {
    mockedProvider = new EthereumMockedProvider();

    mockedProvider.setReturnValue(
      "eth_gasPrice",
      numberToHexString(FIXED_GAS_PRICE),
    );

    automaticGasPriceHandler = new AutomaticGasPriceHandler(mockedProvider);
  });

  describe("when the fee price values are provided", () => {
    it("shouldn't replace the provided gasPrice", async () => {
      const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [
        {
          from: "0x0000000000000000000000000000000000000011",
          to: "0x0000000000000000000000000000000000000011",
          value: 1,
          gasPrice: 456,
        },
      ]);

      automaticGasPriceHandler.handle(jsonRpcRequest);

      assert.equal(getRequestParams(jsonRpcRequest)[0].gasPrice, 456);
    });

    it("shouldn't replace the provided maxFeePerGas and maxPriorityFeePerGas values", async () => {
      const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [
        {
          from: "0x0000000000000000000000000000000000000011",
          to: "0x0000000000000000000000000000000000000011",
          value: 1,
          maxFeePerGas: 456,
          maxPriorityFeePerGas: 789,
        },
      ]);

      automaticGasPriceHandler.handle(jsonRpcRequest);

      assert.equal(getRequestParams(jsonRpcRequest)[0].maxFeePerGas, 456);
      assert.equal(
        getRequestParams(jsonRpcRequest)[0].maxPriorityFeePerGas,
        789,
      );
    });
  });

  describe("Default fee price values", () => {
    describe("When eth_feeHistory is available and EIP1559 is supported", () => {
      const latestBaseFeeInMockedProvider = 80;

      beforeEach(() => {
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

      it("should use the reward return value as default maxPriorityFeePerGas", async () => {
        const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [
          {
            from: "0x0000000000000000000000000000000000000011",
            to: "0x0000000000000000000000000000000000000011",
            value: 1,
            maxFeePerGas: "0x99",
          },
        ]);

        await automaticGasPriceHandler.handle(jsonRpcRequest);

        assert.equal(
          getRequestParams(jsonRpcRequest)[0].maxPriorityFeePerGas,
          "0x4",
        );
        assert.equal(getRequestParams(jsonRpcRequest)[0].maxFeePerGas, "0x99");
      });

      it("should add the reward to the maxFeePerGas if not big enough", async () => {
        const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [
          {
            from: "0x0000000000000000000000000000000000000011",
            to: "0x0000000000000000000000000000000000000011",
            value: 1,
            maxFeePerGas: "0x1",
          },
        ]);

        await automaticGasPriceHandler.handle(jsonRpcRequest);

        assert.equal(
          getRequestParams(jsonRpcRequest)[0].maxPriorityFeePerGas,
          "0x4",
        );
        assert.equal(getRequestParams(jsonRpcRequest)[0].maxFeePerGas, "0x5");
      });

      it("should use the expected max base fee of N blocks in the future if maxFeePerGas is missing", async () => {
        const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [
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
                AutomaticGasPriceHandler.EIP1559_BASE_FEE_MAX_FULL_BLOCKS_PREFERENCE,
              ),
        );

        await automaticGasPriceHandler.handle(jsonRpcRequest);

        assert.equal(
          getRequestParams(jsonRpcRequest)[0].maxPriorityFeePerGas,
          "0x1",
        );
        assert.equal(
          getRequestParams(jsonRpcRequest)[0].maxFeePerGas,
          numberToHexString(expectedBaseFee),
        );
      });
    });

    describe("when the eth_feeHistory result causes maxPriorityFeePerGas to be 0 and eth_maxPriorityFeePerGas doesn't exist", () => {
      const latestBaseFeeInMockedProvider = 80;

      beforeEach(() => {
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

      it("should use a non-zero maxPriorityFeePerGas", async () => {
        const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [
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
                AutomaticGasPriceHandler.EIP1559_BASE_FEE_MAX_FULL_BLOCKS_PREFERENCE,
              ),
        );

        await automaticGasPriceHandler.handle(jsonRpcRequest);

        assert.equal(
          getRequestParams(jsonRpcRequest)[0].maxPriorityFeePerGas,
          "0x1",
        );
        assert.equal(
          getRequestParams(jsonRpcRequest)[0].maxFeePerGas,
          numberToHexString(expectedBaseFee),
        );
      });
    });

    describe("when the eth_feeHistory result causes maxPriorityFeePerGas to be 0 and eth_maxPriorityFeePerGas exists", () => {
      const latestBaseFeeInMockedProvider = 80;

      beforeEach(() => {
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

      it("should use the result of eth_maxPriorityFeePerGas as maxPriorityFeePerGas", async () => {
        const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [
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
                AutomaticGasPriceHandler.EIP1559_BASE_FEE_MAX_FULL_BLOCKS_PREFERENCE,
              ),
        );

        await automaticGasPriceHandler.handle(jsonRpcRequest);

        assert.equal(
          getRequestParams(jsonRpcRequest)[0].maxPriorityFeePerGas,
          "0x12",
        );
        assert.equal(
          getRequestParams(jsonRpcRequest)[0].maxFeePerGas,
          numberToHexString(expectedBaseFee),
        );
      });
    });

    describe("when eth_feeHistory is available and EIP1559 is not supported", () => {
      const latestBaseFeeInMockedProvider = 80;

      beforeEach(() => {
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

    describe("when eth_feeHistory is not available", () => {
      beforeEach(() => {
        mockedProvider.setReturnValue("eth_getBlockByNumber", {});
      });

      runTestUseLegacyGasPrice();
    });

    /**
     * Group of tests that expect gasPrice to be used instead of EIP1559 fields
     */
    function runTestUseLegacyGasPrice() {
      it("should use gasPrice when nothing is provided", async () => {
        const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [
          {
            from: "0x0000000000000000000000000000000000000011",
            to: "0x0000000000000000000000000000000000000011",
            value: 1,
          },
        ]);

        await automaticGasPriceHandler.handle(jsonRpcRequest);

        assert.equal(
          getRequestParams(jsonRpcRequest)[0].gasPrice,
          numberToHexString(FIXED_GAS_PRICE),
        );
      });

      it("should use gasPrice as default maxPriorityFeePerGas, adding it to maxFeePerGas if necessary", async () => {
        const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [
          {
            from: "0x0000000000000000000000000000000000000011",
            to: "0x0000000000000000000000000000000000000011",
            value: 1,
            maxFeePerGas: "0x1",
          },
        ]);

        await automaticGasPriceHandler.handle(jsonRpcRequest);

        assert.equal(
          getRequestParams(jsonRpcRequest)[0].maxPriorityFeePerGas,
          numberToHexString(FIXED_GAS_PRICE),
        );
        assert.equal(
          getRequestParams(jsonRpcRequest)[0].maxFeePerGas,
          numberToHexString(FIXED_GAS_PRICE + 1),
        );
      });

      it("should use gasPrice as default maxFeePerGas, fixing maxPriorityFee to it if necessary", async () => {
        const jsonRpcRequest = getJsonRpcRequest(1, "eth_sendTransaction", [
          {
            from: "0x0000000000000000000000000000000000000011",
            to: "0x0000000000000000000000000000000000000011",
            value: 1,
            maxPriorityFeePerGas: numberToHexString(FIXED_GAS_PRICE + 2),
          },
        ]);

        await automaticGasPriceHandler.handle(jsonRpcRequest);

        assert.equal(
          getRequestParams(jsonRpcRequest)[0].maxPriorityFeePerGas,
          numberToHexString(FIXED_GAS_PRICE + 2),
        );
        assert.equal(
          getRequestParams(jsonRpcRequest)[0].maxFeePerGas,
          numberToHexString(FIXED_GAS_PRICE * 2 + 2),
        );
      });
    }
  });

  it("should forward the other calls", async () => {
    const jsonRpcRequest = getJsonRpcRequest(
      1,
      "eth_getBlockByNumber",
      [1, 2, 3, 4],
    );

    await automaticGasPriceHandler.handle(jsonRpcRequest);

    assert.deepEqual(jsonRpcRequest.params, [1, 2, 3, 4]);
  });
});
