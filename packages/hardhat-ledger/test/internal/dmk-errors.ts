import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isDeviceLockedError,
  isDeviceNotConnectedError,
  isDeviceNotReadyError,
  isReconnectableError,
  isRejectedByUserError,
  LedgerDeviceActionStoppedError,
  LedgerDeviceError,
  LedgerNoDeviceFoundError,
  toLedgerError,
} from "../../src/internal/dmk-errors.js";
import {
  NodeHidSendReportError,
  OpeningConnectionError,
} from "../../src/internal/dmk-imports.js";
import {
  ETH_APP_LOCKED_ERROR,
  ETH_APP_REJECTED_ERROR,
  ACTION_REFUSED_ERROR,
} from "../helpers/ledger-device-mock.js";

describe("dmk-errors", () => {
  describe("LedgerDeviceError", () => {
    it("should build the message from the tag", () => {
      assert.equal(
        new LedgerDeviceError({
          _tag: "DeviceLockedError",
          message: "Device locked.",
        }).message,
        "DeviceLockedError: Device locked.",
      );
      assert.equal(
        new LedgerDeviceError({ _tag: "DeviceBusyError" }).message,
        "DeviceBusyError",
      );
    });

    it("should keep the command status word", () => {
      assert.equal(
        new LedgerDeviceError(ETH_APP_REJECTED_ERROR).errorCode,
        "6985",
      );
      assert.equal(
        new LedgerDeviceError({ _tag: "DeviceBusyError" }).errorCode,
        undefined,
      );
    });

    it("should keep an original error as the cause", () => {
      const cause = new Error("the real failure");

      assert.equal(
        new LedgerDeviceError({ _tag: "UnknownDAError", originalError: cause })
          .cause,
        cause,
      );
    });
  });

  describe("toLedgerError", () => {
    it("should pass an Error through untouched", () => {
      const error = new LedgerNoDeviceFoundError();

      assert.equal(toLedgerError(error), error);
    });

    it("should wrap a value that is neither an Error nor a DmkError", () => {
      const wrapped = toLedgerError("something went wrong");

      assert.ok(
        wrapped instanceof LedgerDeviceError,
        "It should be a LedgerDeviceError",
      );
      assert.equal(wrapped.tag, "UnknownDAError");
    });
  });

  describe("classification", () => {
    it("should classify the tag the DMK actually gives its connection-opening error", () => {
      // This class is exported under a different name from its tag.
      const opening = new OpeningConnectionError(new Error("in use"));

      assert.equal(
        isDeviceNotConnectedError(new LedgerDeviceError(opening)),
        true,
      );
    });

    it("should classify a missing device as not connected", () => {
      assert.equal(
        isDeviceNotConnectedError(new LedgerNoDeviceFoundError()),
        true,
      );

      for (const tag of ["DeviceNotRecognizedError", "UnknownDeviceError"]) {
        assert.equal(
          isDeviceNotConnectedError(new LedgerDeviceError({ _tag: tag })),
          true,
          `${tag} should be a not-connected error`,
        );
      }
    });

    it("should classify lost devices as reconnectable", () => {
      // A transport write can fail before the DMK sees the detach.
      const transportWriteFailure = new NodeHidSendReportError(
        new Error("write failed"),
      );

      for (const tag of [
        "DeviceNotInitializedError",
        "DisconnectError",
        "ReconnectionFailedError",
        transportWriteFailure._tag,
      ]) {
        assert.equal(
          isReconnectableError(new LedgerDeviceError({ _tag: tag })),
          true,
          `${tag} should be reconnectable`,
        );
      }
    });

    it("should classify a rejection on the device", () => {
      assert.equal(
        isRejectedByUserError(new LedgerDeviceError(ETH_APP_REJECTED_ERROR)),
        true,
      );
      assert.equal(
        isRejectedByUserError(new LedgerDeviceError(ACTION_REFUSED_ERROR)),
        true,
      );
    });

    it("should classify status 6982 as a locked device, not a rejection", () => {
      const error = new LedgerDeviceError(ETH_APP_LOCKED_ERROR);

      assert.equal(isDeviceNotReadyError(error), true);
      assert.equal(isDeviceLockedError(error), true);
      assert.equal(isRejectedByUserError(error), false);
    });

    it("should not classify other Ethereum app errors as a rejection", () => {
      const invalidData = {
        ...ETH_APP_REJECTED_ERROR,
        message: "Invalid data",
        errorCode: "6a80",
      };

      assert.equal(
        isRejectedByUserError(new LedgerDeviceError(invalidData)),
        false,
      );
    });

    it("should not classify unrelated errors", () => {
      const error = new LedgerDeviceActionStoppedError();

      assert.equal(isReconnectableError(error), false);
      assert.equal(isDeviceNotReadyError(error), false);
      assert.equal(isDeviceNotConnectedError(error), false);
      assert.equal(isRejectedByUserError(error), false);
    });
  });
});
