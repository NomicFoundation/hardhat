import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isDeviceNotConnectedError,
  isDeviceNotReadyError,
  isReconnectableError,
  LedgerDeviceActionStoppedError,
  LedgerDeviceError,
  LedgerNoDeviceFoundError,
  toLedgerError,
} from "../../src/internal/dmk-errors.js";
import {
  NodeHidSendReportError,
  OpeningConnectionError,
} from "../helpers/dmk-error-classes.js";

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

    it("should not classify unrelated errors", () => {
      const error = new LedgerDeviceActionStoppedError();

      assert.equal(isReconnectableError(error), false);
      assert.equal(isDeviceNotReadyError(error), false);
      assert.equal(isDeviceNotConnectedError(error), false);
    });
  });
});
