import type { Observable, Observer, Subscription } from "rxjs";

import { LedgerNoDeviceFoundError, toLedgerError } from "./dmk-errors.js";

/**
 * Resolves with the first device the given stream reports.
 *
 * The DMK reports no device as an empty list and leaves the stream open, so we
 * add a timeout. Polling also catches devices missed while re-enumerating.
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

    // The stream may emit during `subscribe`, before this is assigned.
    let subscription: Subscription | undefined;

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
        // A completed stream cannot discover more devices.
        settle(() => reject(new LedgerNoDeviceFoundError()));
      },
    };

    const listen = (): void => {
      subscription?.unsubscribe();

      const listening = listenToAvailableDevices().subscribe(observer);

      if (settled) {
        // A replayed device settled before `subscription` was assigned.
        listening.unsubscribe();

        return;
      }

      subscription = listening;
    };

    // Armed before the first `listen`, which may settle synchronously and
    // must find them to clear them.
    const poll = setInterval(listen, pollIntervalMs);
    const timeout = setTimeout(() => {
      settle(() => reject(new LedgerNoDeviceFoundError()));
    }, timeoutMs);

    listen();
  });
}
