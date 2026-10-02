import type { Observable, Observer, Subscription } from "rxjs";

import { LedgerNoDeviceFoundError, toLedgerError } from "./dmk-errors.js";

/**
 * Resolves with the first device the given stream reports.
 *
 * The DMK reports "no device plugged in" as an empty list rather than an error,
 * and the stream stays open forever, so the timeout is ours. Generic over the
 * device type so that it can be tested without a Device Management Kit.
 *
 * The devices are listed again every `pollIntervalMs`, because the stream can
 * miss a device that comes back. The Node HID transport lists the HID devices
 * as soon as the USB device is attached, and when the HID device is not there
 * yet it drops the event and never updates the stream. Only a new
 * `listenToAvailableDevices` call lists them again. A device is attached that
 * way whenever it re-enumerates, e.g. because it opened the Ethereum app.
 *
 * @param listenToAvailableDevices Lists the reachable devices, as the DMK's
 * `listenToAvailableDevices` does.
 * @param timeoutMs How long to wait for a device to show up.
 * @param pollIntervalMs How often to list the devices again.
 *
 * @throws LedgerNoDeviceFoundError if no device shows up in time.
 */
export async function discoverFirstDevice<DeviceT>(
  listenToAvailableDevices: () => Observable<DeviceT[]>,
  timeoutMs: number,
  pollIntervalMs: number,
): Promise<DeviceT> {
  return await new Promise<DeviceT>((resolve, reject) => {
    let settled = false;

    // `listenToAvailableDevices` is backed by a `BehaviorSubject`, so it
    // replays known devices *during* the `subscribe` call, before any of these
    // is assigned. `settle` therefore tears down only what is bound, and
    // `listen` and the code after its first call check `settled` afterwards.
    /* eslint-disable prefer-const -- assigned below, read by `settle` during a
    synchronous emission */
    let subscription: Subscription | undefined;
    let timeout: NodeJS.Timeout | undefined;
    let poll: NodeJS.Timeout | undefined;
    /* eslint-enable prefer-const */

    const settle = (report: () => void): void => {
      if (settled) {
        return;
      }

      settled = true;
      report();
      clearTimeout(timeout);
      clearInterval(poll);
      subscription?.unsubscribe();
    };

    const observer: Partial<Observer<DeviceT[]>> = {
      next: (devices) => {
        const [device] = devices;

        if (device === undefined) {
          return;
        }

        settle(() => resolve(device));
      },
      error: (error: unknown) => {
        settle(() => reject(toLedgerError(error)));
      },
      complete: () => {
        // The DMK completes the stream only when it has no transport to list
        // devices on, and listing them again would not change that.
        settle(() => reject(new LedgerNoDeviceFoundError()));
      },
    };

    const listen = (): void => {
      subscription?.unsubscribe();

      const listening = listenToAvailableDevices().subscribe(observer);

      if (settled) {
        // A replayed device settled the promise before `subscription` was
        // assigned.
        listening.unsubscribe();

        return;
      }

      subscription = listening;
    };

    listen();

    if (settled) {
      return;
    }

    poll = setInterval(listen, pollIntervalMs);

    timeout = setTimeout(() => {
      settle(() => reject(new LedgerNoDeviceFoundError()));
    }, timeoutMs);
  });
}
