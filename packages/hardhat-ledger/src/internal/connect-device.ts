import type {
  DeviceManagementKit,
  DeviceSessionId,
  SignerEth,
} from "./dmk-imports.js";
import type { LedgerDevice } from "./types.js";

import { createDebug } from "@nomicfoundation/hardhat-utils/debug";

import { discoverFirstDevice } from "./discover-device.js";
import { toLedgerError } from "./dmk-errors.js";
import {
  DeviceManagementKitBuilder,
  nodeHidTransportFactory,
  SignerEthBuilder,
  usb,
} from "./dmk-imports.js";

const log = createDebug("hardhat:ledger:connect-device");

const DISCOVERY_POLL_INTERVAL_MS = 500;

/**
 * One DMK for the whole process. Destroying its transport removes node-usb's
 * own hotplug hooks, which would leave every later DMK without attach/detach
 * events.
 */
let deviceManagementKit: DeviceManagementKit | undefined;

function getDeviceManagementKit(): DeviceManagementKit {
  if (deviceManagementKit === undefined) {
    deviceManagementKit = new DeviceManagementKitBuilder()
      .addTransport((args) => {
        const transport = nodeHidTransportFactory(args);

        // The transport's hotplug listeners would keep the process alive;
        // only open sessions should.
        usb.unrefHotplugEvents();

        return transport;
      })
      .build();
  }

  return deviceManagementKit;
}

/**
 * Connects to the first available Ledger device and returns an Ethereum signer
 * for its session.
 *
 * @param timeoutMs How long to wait for a device to show up.
 */
export async function connectDevice(timeoutMs: number): Promise<LedgerDevice> {
  const dmk = getDeviceManagementKit();

  let sessionId: DeviceSessionId | undefined;

  try {
    const device = await discoverFirstDevice(
      () => dmk.listenToAvailableDevices({}),
      timeoutMs,
      DISCOVERY_POLL_INTERVAL_MS,
    );

    log(`Connecting to Ledger device "${device.name}"`);

    // The refresher's ping can park an action forever after an unplug. The
    // signer polls the device itself, so the session state is not needed.
    sessionId = await dmk.connect({
      device,
      sessionRefresherOptions: { isRefresherDisabled: true },
    });

    const signer: SignerEth = new SignerEthBuilder({ dmk, sessionId }).build();

    return openedDevice(dmk, sessionId, signer);
  } catch (thrown) {
    if (sessionId !== undefined) {
      await disconnectSession(dmk, sessionId);
    }

    // The DMK may reject with a non-Error value. Normalize it before rethrowing.
    const error = toLedgerError(thrown);

    throw error;
  }
}

function openedDevice(
  dmk: DeviceManagementKit,
  sessionId: DeviceSessionId,
  signer: SignerEth,
): LedgerDevice {
  let closed = false;

  return {
    signer,
    close: async () => {
      // A reconnect and the network hook can both close the same session.
      if (closed) {
        return;
      }

      closed = true;

      await disconnectSession(dmk, sessionId);
    },
  };
}

async function disconnectSession(
  dmk: DeviceManagementKit,
  sessionId: DeviceSessionId,
): Promise<void> {
  try {
    await dmk.disconnect({ sessionId });
  } catch (error) {
    // There is nothing else to clean up if disconnecting fails.
    log("Failed to disconnect the Ledger device session");
    log(error);
  }
}
