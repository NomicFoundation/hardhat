import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import Module from "node:module";
import { describe, it } from "node:test";

import { assertRejects } from "@nomicfoundation/hardhat-test-utils";

interface ModuleLoader {
  _load: (request: string, ...rest: unknown[]) => unknown;
}

/** A Ledger Nano X as `node-hid` lists it. */
const NANO_X_HID_DEVICE = {
  vendorId: 0x2c97,
  productId: 0x4011,
  path: "/dev/hidraw0",
  interface: 0,
  usagePage: 0xffa0,
};

let hidDevices: Array<typeof NANO_X_HID_DEVICE> = [];

/**
 * The transport kit `require`s these native modules. Stubbing them runs the
 * real kit without hardware or libusb.
 */
const STUBS: Record<string, unknown> = {
  "node-hid": {
    devicesAsync: async () => hidDevices,
    HIDAsync: {
      open: async () =>
        Object.assign(new EventEmitter(), {
          write: async () => 0,
          close: async () => {},
        }),
    },
  },
  usb: {
    usb: { on() {}, removeAllListeners() {}, unrefHotplugEvents() {} },
  },
};

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- `_load` is untyped
const moduleLoader = Module as unknown as ModuleLoader;
const originalLoad = moduleLoader._load;

moduleLoader._load = (request, ...rest) =>
  request in STUBS
    ? STUBS[request]
    : originalLoad.call(Module, request, ...rest);

// The kit loads with this module, so it is imported after the stubs are in place.
const loadConnectDevice = async () =>
  await import("../../src/internal/connect-device.js");

describe("connectDevice lifecycle", () => {
  it("should release the kit once a failed connection is closed", async () => {
    const { closeDeviceManagementKit, connectDevice } =
      await loadConnectDevice();
    const exitListenersBefore = process.listenerCount("exit");

    await assertRejects(connectDevice(10));

    // The kit is kept for retries, so its exit listener is still there.
    assert.equal(process.listenerCount("exit"), exitListenersBefore + 1);

    closeDeviceManagementKit();

    assert.equal(process.listenerCount("exit"), exitListenersBefore);
  });

  it("should release the kit once a connected device is closed", async () => {
    const { closeDeviceManagementKit, connectDevice } =
      await loadConnectDevice();
    const exitListenersBefore = process.listenerCount("exit");
    hidDevices = [NANO_X_HID_DEVICE];

    const device = await connectDevice(1000);

    await device.close();
    closeDeviceManagementKit();

    assert.equal(process.listenerCount("exit"), exitListenersBefore);
  });
});
