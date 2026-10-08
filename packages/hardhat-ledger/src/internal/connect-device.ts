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
  NodeHidTransport,
  nodeHidTransportFactory,
  SignerEthBuilder,
} from "./dmk-imports.js";

const log = createDebug("hardhat:ledger:connect-device");

const DISCOVERY_POLL_INTERVAL_MS = 500;

type ExitListener = Parameters<typeof process.off>[1];

/**
 * Creating the DMK is expensive, so reuse it across connections.
 */
let deviceManagementKit: DeviceManagementKit | undefined;

/**
 * A reference to the DMK's hidden transport, used to release its USB listeners.
 */
let capturedTransport: InstanceType<typeof NodeHidTransport> | undefined;

/**
 * `destroy()` leaves the transport's exit listeners behind. Track them so we
 * can remove them ourselves.
 */
let capturedExitListeners: ExitListener[] = [];

/**
 * Sessions using the shared transport, including sessions still opening. The
 * transport can only be destroyed when this reaches zero.
 */
let liveDeviceSessions = 0;

function getDeviceManagementKit(): DeviceManagementKit {
  if (deviceManagementKit === undefined) {
    deviceManagementKit = new DeviceManagementKitBuilder()
      .addTransport((args) => {
        const exitListenersBefore = new Set(process.listeners("exit"));

        const transport = nodeHidTransportFactory(args);

        capturedExitListeners = process
          .listeners("exit")
          .filter((listener) => !exitListenersBefore.has(listener));

        if (transport instanceof NodeHidTransport) {
          capturedTransport = transport;
        }

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

  // Discovery uses the transport before the session opens.
  liveDeviceSessions++;

  let sessionId: DeviceSessionId | undefined;

  try {
    const device = await discoverFirstDevice(
      () => dmk.listenToAvailableDevices({}),
      timeoutMs,
      DISCOVERY_POLL_INTERVAL_MS,
    );

    log(`Connecting to Ledger device "${device.name}"`);

    sessionId = await dmk.connect({ device });

    const signer: SignerEth = new SignerEthBuilder({ dmk, sessionId }).build();

    return openedDevice(dmk, sessionId, signer);
  } catch (thrown) {
    if (sessionId !== undefined) {
      await disconnectSession(dmk, sessionId);
    }

    // Disconnect before allowing the shared transport to be destroyed.
    liveDeviceSessions--;

    // Keep the DMK for retries. Creating a new one would add more listeners.
    // `LedgerHandler#init` closes it after the final attempt.

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

      // Disconnect before allowing the shared transport to be destroyed.
      liveDeviceSessions--;
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

/**
 * Releases the process-wide resources that otherwise keep Hardhat running.
 */
export function closeDeviceManagementKit(): void {
  if (deviceManagementKit === undefined) {
    return;
  }

  if (liveDeviceSessions > 0) {
    log(
      `Not closing the Device Management Kit: ${liveDeviceSessions} device session(s) are still in use`,
    );

    return;
  }

  try {
    deviceManagementKit.close();
  } catch (error) {
    log("Failed to close the Device Management Kit");
    log(error);
  }

  // Closing may create the lazy transport. Destroy it afterward.
  try {
    capturedTransport?.destroy();
  } catch (error) {
    log("Failed to destroy the Node HID transport");
    log(error);
  }

  for (const listener of capturedExitListeners) {
    process.off("exit", listener);
  }

  deviceManagementKit = undefined;
  capturedTransport = undefined;
  capturedExitListeners = [];
}
