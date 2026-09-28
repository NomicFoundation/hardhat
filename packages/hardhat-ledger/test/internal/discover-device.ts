import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assertRejects } from "@nomicfoundation/hardhat-test-utils";
import { BehaviorSubject, Subject } from "rxjs";

import { discoverFirstDevice } from "../../src/internal/discover-device.js";
import {
  LedgerDeviceError,
  LedgerNoDeviceFoundError,
} from "../../src/internal/dmk-errors.js";

interface TestDevice {
  name: string;
}

const DEVICE: TestDevice = { name: "Ledger Nano X" };

describe("discoverFirstDevice", () => {
  it("should resolve with a device the stream replays during subscribe", async () => {
    // The DMK's device list replays synchronously, during `subscribe`, on every
    // reconnect.
    const availableDevices = new BehaviorSubject<TestDevice[]>([DEVICE]);

    assert.equal(await discoverFirstDevice(availableDevices, 1000), DEVICE);
    assert.equal(availableDevices.observed, false);
  });

  it("should resolve with the first device reported after an empty list", async () => {
    const availableDevices = new BehaviorSubject<TestDevice[]>([]);

    const discovered = discoverFirstDevice(availableDevices, 1000);

    availableDevices.next([]);
    availableDevices.next([DEVICE]);

    assert.equal(await discovered, DEVICE);
    assert.equal(availableDevices.observed, false);
  });

  it("should reject and unsubscribe when no device shows up in time", async () => {
    const availableDevices = new BehaviorSubject<TestDevice[]>([]);

    await assertRejects(
      discoverFirstDevice(availableDevices, 10),
      (error) => error instanceof LedgerNoDeviceFoundError,
      "Expected a LedgerNoDeviceFoundError",
    );

    assert.equal(availableDevices.observed, false);
  });

  it("should reject with a wrapped error when the stream fails", async () => {
    const availableDevices = new Subject<TestDevice[]>();

    const discovered = discoverFirstDevice(availableDevices, 1000);

    // The DMK signals failures with plain objects, not `Error` instances.
    availableDevices.error({ _tag: "NoAccessibleDeviceError" });

    await assertRejects(
      discovered,
      (error) =>
        error instanceof LedgerDeviceError &&
        error.tag === "NoAccessibleDeviceError",
      "Expected the raw DmkError to be wrapped, keeping its tag",
    );
  });
});
