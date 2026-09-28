import type { Observable, Subscription } from "rxjs";

import { LedgerNoDeviceFoundError, toLedgerError } from "./dmk-errors.js";

/**
 * Resolves with the first device the given stream reports.
 *
 * The DMK reports "no device plugged in" as an empty list rather than an error,
 * and the stream stays open forever, so the timeout is ours. Generic over the
 * device type so that it can be tested without a Device Management Kit.
 *
 * @param availableDevices The reachable devices, as `listenToAvailableDevices`
 * reports them.
 * @param timeoutMs How long to wait for a device to show up.
 *
 * @throws LedgerNoDeviceFoundError if no device shows up in time.
 */
export async function discoverFirstDevice<DeviceT>(
  availableDevices: Observable<DeviceT[]>,
  timeoutMs: number,
): Promise<DeviceT> {
  return await new Promise<DeviceT>((resolve, reject) => {
    let settled = false;

    // `listenToAvailableDevices` is backed by a `BehaviorSubject`, so it
    // replays known devices *during* the `subscribe` call, before either of
    // these is assigned. The teardown is therefore deferred to `settle`, which
    // runs again below once they are bound.
    /* eslint-disable prefer-const -- assigned below, read by `settle` during a
    synchronous emission */
    let subscription: Subscription | undefined;
    let timeout: NodeJS.Timeout | undefined;
    /* eslint-enable prefer-const */

    const settle = (report: () => void): void => {
      if (settled) {
        return;
      }

      settled = true;
      report();
      clearTimeout(timeout);
      subscription?.unsubscribe();
    };

    subscription = availableDevices.subscribe({
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
        // Completing without ever reporting a device would leave the promise
        // pending.
        settle(() => reject(new LedgerNoDeviceFoundError()));
      },
    });

    if (settled) {
      // A replayed device settled the promise before `subscription` existed.
      subscription.unsubscribe();

      return;
    }

    timeout = setTimeout(() => {
      settle(() => reject(new LedgerNoDeviceFoundError()));
    }, timeoutMs);
  });
}
