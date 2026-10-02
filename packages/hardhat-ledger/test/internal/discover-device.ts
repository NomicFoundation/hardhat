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

/** Longer than any test takes, so that the devices are listed only once. */
const NO_POLLING_MS = 60_000;

describe("discoverFirstDevice", () => {
  it("should resolve with a device the stream replays during subscribe", async () => {
    // The DMK's device list replays synchronously, during `subscribe`, on every
    // reconnect.
    const availableDevices = new BehaviorSubject<TestDevice[]>([DEVICE]);

    assert.equal(
      await discoverFirstDevice(() => availableDevices, 1000, NO_POLLING_MS),
      DEVICE,
    );
    assert.equal(availableDevices.observed, false);
  });

  it("should resolve with the first device reported after an empty list", async () => {
    const availableDevices = new BehaviorSubject<TestDevice[]>([]);

    const discovered = discoverFirstDevice(
      () => availableDevices,
      1000,
      NO_POLLING_MS,
    );

    availableDevices.next([]);
    availableDevices.next([DEVICE]);

    assert.equal(await discovered, DEVICE);
    assert.equal(availableDevices.observed, false);
  });

  it("should reject and unsubscribe when no device shows up in time", async () => {
    const availableDevices = new BehaviorSubject<TestDevice[]>([]);

    await assertRejects(
      discoverFirstDevice(() => availableDevices, 10, NO_POLLING_MS),
      (error) => error instanceof LedgerNoDeviceFoundError,
      "Expected a LedgerNoDeviceFoundError",
    );

    assert.equal(availableDevices.observed, false);
  });

  it("should reject with a wrapped error when the stream fails", async () => {
    const availableDevices = new Subject<TestDevice[]>();

    const discovered = discoverFirstDevice(
      () => availableDevices,
      1000,
      NO_POLLING_MS,
    );

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

  it("should list the devices again until one shows up", async () => {
    // The DMK's stream misses a device that re-enumerates: only listing the
    // devices again reports it.
    const listings: Array<BehaviorSubject<TestDevice[]>> = [];

    const listen = (): BehaviorSubject<TestDevice[]> => {
      const availableDevices = new BehaviorSubject<TestDevice[]>(
        listings.length < 2 ? [] : [DEVICE],
      );

      listings.push(availableDevices);

      return availableDevices;
    };

    assert.equal(await discoverFirstDevice(listen, 1000, 1), DEVICE);
    assert.equal(listings.length, 3);
    assert.ok(
      listings.every((availableDevices) => !availableDevices.observed),
      "Every listing should have been unsubscribed from",
    );
  });

  it("should stop listing the devices once it gives up", async () => {
    let listingCount = 0;

    const listen = (): BehaviorSubject<TestDevice[]> => {
      listingCount++;

      return new BehaviorSubject<TestDevice[]>([]);
    };

    await assertRejects(
      discoverFirstDevice(listen, 20, 1),
      (error) => error instanceof LedgerNoDeviceFoundError,
      "Expected a LedgerNoDeviceFoundError",
    );

    const listingCountAtTimeout = listingCount;

    await new Promise((resolve) => setTimeout(resolve, 20));

    assert.equal(listingCount, listingCountAtTimeout);
  });
});
