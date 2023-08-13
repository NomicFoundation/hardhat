import { assert } from "chai";

import { decodeArtifactCustomError } from "../../../src/new-api/internal/new-execution/abi";
import { decodeError } from "../../../src/new-api/internal/new-execution/error-decoding";
import { EvmExecutionResultTypes } from "../../../src/new-api/internal/new-execution/types/evm-execution";
import { fixture, artifact } from "../../helpers/execution-result-fixtures";

describe("Error decoding", () => {
  function decode(functionName: keyof typeof fixture) {
    const decoded = decodeError(
      fixture[functionName].returnData,
      fixture[functionName].customErrorReported,
      (returnData) => decodeArtifactCustomError(artifact, returnData)
    );

    return { decoded, returnData: fixture[functionName].returnData };
  }

  describe("decodeError", () => {
    describe("Revert without reason", () => {
      describe("When the function doesn't return anything so its a clash with a revert without reason", () => {
        it("should return RevertWithoutReason", async () => {
          const { decoded } = decode("revertWithoutReasonClash");

          assert.deepEqual(decoded, {
            type: EvmExecutionResultTypes.REVERT_WITHOUT_REASON,
          });
        });
      });

      describe("When the function returns something and there's no clash", async () => {
        it("should return RevertWithoutReason", async () => {
          const { decoded } = decode("revertWithoutReasonWithoutClash");
          assert.deepEqual(decoded, {
            type: EvmExecutionResultTypes.REVERT_WITHOUT_REASON,
          });
        });
      });
    });

    it("should return RevertWithReason if a reason is given", async () => {
      const { decoded } = decode("revertWithReasonMessage");
      assert.deepEqual(decoded, {
        type: EvmExecutionResultTypes.REVERT_WITH_REASON,
        message: "reason",
      });
    });

    it("should return RevertWithReason if an empty reason is given", async () => {
      const { decoded } = decode("revertWithEmptyReasonMessage");
      assert.deepEqual(decoded, {
        type: EvmExecutionResultTypes.REVERT_WITH_REASON,
        message: "",
      });
    });

    it("should return RevertWithInvalidData if the revert reason signature is used incorrectlt", async () => {
      const { decoded, returnData } = decode("revertWithInvalidErrorMessage");
      assert.deepEqual(decoded, {
        type: EvmExecutionResultTypes.REVERT_WITH_INVALID_DATA,
        data: returnData,
      });
    });

    it("should return RevertWithPanicCode if a panic code is given", async () => {
      const { decoded } = decode("revertWithPanicCode");
      assert.deepEqual(decoded, {
        type: EvmExecutionResultTypes.REVERT_WITH_PANIC_CODE,
        panicCode: 0x12,
        panicName: "DIVIDE_BY_ZERO",
      });
    });

    it("should return RevertWithInvalidData if the panic code signature is used incorrectly", async () => {
      const { decoded, returnData } = decode("revertWithInvalidErrorMessage");
      assert.deepEqual(decoded, {
        type: EvmExecutionResultTypes.REVERT_WITH_INVALID_DATA,
        data: returnData,
      });
    });

    it("should return RevertWithInvalidData if the panic code signature is used correctly but with a non-existing invalid code", async () => {
      const { decoded, returnData } = decode("revertWithNonExistentPanicCode");
      assert.deepEqual(decoded, {
        type: EvmExecutionResultTypes.REVERT_WITH_INVALID_DATA,
        data: returnData,
      });
    });

    it("should return RevertWithCustomError if a custom error is used", async () => {
      const { decoded } = decode("revertWithCustomError");
      assert.deepEqual(decoded, {
        type: EvmExecutionResultTypes.REVERT_WITH_CUSTOM_ERROR,
        errorName: "CustomError",
        args: {
          positional: [1n, true],
          named: {
            b: true,
          },
        },
      });
    });

    it("should return RevertWithInvalidData if the custom error signature is used incorrectly", async () => {
      const { decoded, returnData } = decode("revertWithInvalidCustomError");
      assert.deepEqual(decoded, {
        type: EvmExecutionResultTypes.REVERT_WITH_INVALID_DATA,
        data: returnData,
      });
    });

    it("should return RevertWithUnknownCustomError if the JSON-RPC errors with a message indicating that there was a custom error", async () => {
      const { decoded, returnData } = decode("revertWithUnknownCustomError");
      assert.deepEqual(decoded, {
        type: EvmExecutionResultTypes.REVERT_WITH_UNKNOWN_CUSTOM_ERROR,
        signature: returnData.slice(0, 10),
        data: returnData,
      });
    });

    it("should return RevertWithInvalidDataOrUnknownCustomError if the returned data is actually invalid", async () => {
      const { decoded, returnData } = decode("revertWithInvalidData");
      assert.deepEqual(decoded, {
        type: EvmExecutionResultTypes.REVERT_WITH_INVALID_DATA_OR_UNKNOWN_CUSTOM_ERROR,
        signature: returnData.slice(0, 10),
        data: returnData,
      });
    });

    describe("Invalid opcode", () => {
      describe("When the function doesn't return anything so its a clash with an invalid opcode", () => {
        it("should return RevertWithoutReason", async () => {
          const { decoded } = decode("invalidOpcodeClash");
          assert.deepEqual(decoded, {
            type: EvmExecutionResultTypes.REVERT_WITHOUT_REASON,
          });
        });
      });

      describe("When the function returns something and there's no clash", async () => {
        it("should return RevertWithoutReason", async () => {
          const { decoded } = decode("invalidOpcode");
          assert.deepEqual(decoded, {
            type: EvmExecutionResultTypes.REVERT_WITHOUT_REASON,
          });
        });
      });
    });
  });
});
