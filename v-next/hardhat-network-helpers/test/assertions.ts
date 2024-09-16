import { describe, it } from "node:test";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import {
  assertRejectsWithHardhatError,
  assertThrowsHardhatError,
} from "@nomicfoundation/hardhat-test-utils";

import {
  assertHexString,
  assertLargerThan,
  assertTxHash,
  assertValidAddress,
} from "../src/internal/assertions.js";

describe("assertions", () => {
  describe("assertHexString", () => {
    it("should throw if the string is not a hex string", async () => {
      assertThrowsHardhatError(
        () => assertHexString("0xZZZZ"),
        HardhatError.ERRORS.NETWORK_HELPERS.INVALID_HEX_STRING,
        {
          value: "0xZZZZ",
        },
      );
    });

    it("should throw if the string does not start with 0x", async () => {
      assertThrowsHardhatError(
        () => assertHexString("AAAA"),
        HardhatError.ERRORS.NETWORK_HELPERS.INVALID_HEX_STRING,
        {
          value: "AAAA",
        },
      );
    });
  });

  describe("assertTxHash", () => {
    it("should throw if the string is not a hex string", async () => {
      assertThrowsHardhatError(
        () => assertTxHash("0xZZZZ"),
        HardhatError.ERRORS.NETWORK_HELPERS.INVALID_HEX_STRING,
        {
          value: "0xZZZZ",
        },
      );
    });

    it("should throw if the string is not a valid transaction hash", async () => {
      assertThrowsHardhatError(
        () => assertTxHash("0x123"),
        HardhatError.ERRORS.NETWORK_HELPERS.INVALID_TX_HASH,
        {
          value: "0x123",
        },
      );
    });
  });

  describe("assertValidAddress", () => {
    it("should throw if the address is not a valid address", async () => {
      await assertRejectsWithHardhatError(
        async () => assertValidAddress("0xZZZZ"),
        HardhatError.ERRORS.NETWORK_HELPERS.INVALID_ADDRESS,
        {
          value: "0xZZZZ",
        },
      );
    });

    it("should throw if the address is not a valid checksum address", async () => {
      await assertRejectsWithHardhatError(
        async () =>
          assertValidAddress("0xCF5609B003B2776699EEA1233F7C82D5695CC9AA"),
        HardhatError.ERRORS.NETWORK_HELPERS.INVALID_CHECKSUM_ADDRESS,
        {
          value: "0xCF5609B003B2776699EEA1233F7C82D5695CC9AA",
        },
      );
    });
  });

  describe("assertLargerThan", () => {
    describe("with numbers", () => {
      it("should throw if a is smaller than b", async () => {
        assertThrowsHardhatError(
          () => assertLargerThan(1, 2),
          HardhatError.ERRORS.NETWORK_HELPERS.BLOCK_NUMBER_SMALLER_THAN_CURRENT,
          {
            newValue: 1,
            currentValue: 2,
          },
        );
      });

      it("should throw if a is equal to b", async () => {
        assertThrowsHardhatError(
          () => assertLargerThan(2, 2),
          HardhatError.ERRORS.NETWORK_HELPERS.BLOCK_NUMBER_SMALLER_THAN_CURRENT,
          {
            newValue: 2,
            currentValue: 2,
          },
        );
      });

      it("should not throw if a is larger than b", () => {
        assertLargerThan(3, 2);
      });
    });

    describe("with bigints", () => {
      it("should throw if a is smaller than b", async () => {
        assertThrowsHardhatError(
          () => assertLargerThan(1n, 2n),
          HardhatError.ERRORS.NETWORK_HELPERS.BLOCK_NUMBER_SMALLER_THAN_CURRENT,
          {
            newValue: 1n,
            currentValue: 2n,
          },
        );
      });

      it("should throw if a is equal to b", async () => {
        assertThrowsHardhatError(
          () => assertLargerThan(2n, 2n),
          HardhatError.ERRORS.NETWORK_HELPERS.BLOCK_NUMBER_SMALLER_THAN_CURRENT,
          {
            newValue: 2n,
            currentValue: 2n,
          },
        );
      });

      it("should not throw if a is larger than b", () => {
        assertLargerThan(3n, 2n);
      });
    });
  });
});
