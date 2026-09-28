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
} from "./dmk-imports.js";

const log = createDebug("hardhat:ledger:connect-device");

/**
 * The transport the DMK built for us.
 *
 * `DeviceManagementKit#close()` does *not* release the USB hotplug listeners
 * `NodeHidTransport` registers, so a process that ever built a DMK never exits;
 * `NodeHidTransport#destroy()` is what frees the event loop. The DMK exposes no
 * way to reach the transport, so we wrap the factory to capture it.
 */
interface CapturedTransport {
  destroy?: () => void;
}

type ExitListener = Parameters<typeof process.off>[1];

/**
 * The DMK is expensive to build and is meant to be long-lived, so we build it
 * once per process and reuse it across connections.
 */
let deviceManagementKit: DeviceManagementKit | undefined;
let capturedTransport: CapturedTransport | undefined;

/**
 * The `process.on("exit")` listeners the transport registered when it was built.
 * `destroy()` leaves them behind, and the kit is rebuilt whenever a connection
 * is opened after the previous one was closed, so Node warns about a leak once
 * ten have piled up.
 */
let capturedExitListeners: ExitListener[] = [];

/**
 * How many device sessions are open or being opened.
 *
 * The kit and its transport are process-wide but are torn down from
 * per-connection code, and Hardhat supports several connections at once.
 * Without this count, closing one would destroy the transport out from under
 * another. Sessions being opened count too: the transport is in use from the
 * moment discovery starts.
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

        /* eslint-disable @typescript-eslint/consistent-type-assertions --
        `destroy` is part of the concrete `NodeHidTransport` class but not of the
        `Transport` interface the factory is typed to return. */
        capturedTransport = transport as unknown as CapturedTransport;
        /* eslint-enable @typescript-eslint/consistent-type-assertions */

        return transport;
      })
      .build();
  }

  return deviceManagementKit;
}

/**
 * Connects to the first Ledger device the Node HID transport can see, and
 * returns an Ethereum signer bound to its session.
 *
 * @param timeoutMs How long to wait for a device to show up.
 */
export async function connectDevice(timeoutMs: number): Promise<LedgerDevice> {
  const dmk = getDeviceManagementKit();

  // Counted before the session exists: the transport is in use from here on,
  // and `openedDevice` takes the count over once the session is open.
  liveDeviceSessions++;

  let sessionId: DeviceSessionId | undefined;

  try {
    const device = await discoverFirstDevice(
      dmk.listenToAvailableDevices({}),
      timeoutMs,
    );

    log(`Connecting to Ledger device "${device.name}"`);

    sessionId = await dmk.connect({ device });

    const signer: SignerEth = new SignerEthBuilder({ dmk, sessionId }).build();

    return openedDevice(dmk, sessionId, signer);
  } catch (thrown) {
    if (sessionId !== undefined) {
      await disconnectSession(dmk, sessionId);
    }

    // Decremented only once the disconnect is done, so that another connection
    // cannot destroy the transport while this one is still using it.
    liveDeviceSessions--;

    // The kit is deliberately left in place for the caller to retry against:
    // rebuilding the transport per attempt would register another exit listener
    // each time. `LedgerHandler#init` closes it once it gives up.

    // The DMK rejects with raw `DmkError` values, which are not `Error`
    // instances, and the handler can only classify and wrap `Error`s. Bound to
    // a variable first because only rethrowing one is allowed here.
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
      // `close` can be reached twice for the same session: by a reconnect
      // resetting it, and by the network hook closing the connection.
      if (closed) {
        return;
      }

      closed = true;

      await disconnectSession(dmk, sessionId);

      // Decremented only once the disconnect is done, so that another
      // connection cannot destroy the transport from under it.
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
    // Disconnecting a device that is already gone is not an error we can act
    // on, and it must not mask the error that led us here.
    log("Failed to disconnect the Ledger device session");
    log(error);
  }
}

/**
 * Releases every process-wide resource the DMK holds. Without this, a Hardhat
 * run that touched a Ledger never exits.
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

  // Must come after `close()`: the DMK instantiates the transport lazily, so
  // closing it is what makes the transport exist in the first place.
  try {
    capturedTransport?.destroy?.();
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
