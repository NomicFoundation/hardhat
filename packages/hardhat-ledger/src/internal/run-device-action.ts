import type { DeviceActionState, DmkError } from "./dmk-imports.js";
import type { Observable, Subscription } from "rxjs";

import { createDebug } from "@nomicfoundation/hardhat-utils/debug";

import {
  LedgerDeviceActionStoppedError,
  LedgerDeviceError,
} from "./dmk-errors.js";
import { DeviceActionStatus } from "./dmk-imports.js";

const log = createDebug("hardhat:ledger:run-device-action");

/**
 * The shape returned by every DMK device action. Declared structurally, rather
 * than imported, so that tests can supply a plain object.
 */
export interface DeviceAction<Output> {
  readonly observable: Observable<
    DeviceActionState<Output, DmkError, IntermediateValue>
  >;
  cancel(): void;
}

interface IntermediateValue {
  readonly requiredUserInteraction: string;
}

/**
 * What the user has to do on the device, in plain words, keyed by the
 * interaction the DMK reports in a device action's `Pending` states.
 */
const USER_INTERACTION_MESSAGES: Record<string, string> = {
  "unlock-device": "Unlock your Ledger device to continue",
  "confirm-open-app": "Confirm opening the Ethereum app on your Ledger device",
  "allow-secure-connection":
    "Allow the secure connection on your Ledger device",
  "sign-transaction":
    "Review and approve the transaction on your Ledger device",
  "sign-personal-message":
    "Review and approve the message on your Ledger device",
  "sign-typed-data": "Review and approve the typed data on your Ledger device",
  "verify-address": "Confirm the address on your Ledger device",
  "web3-checks-opt-in": "Answer the Web3 Checks prompt on your Ledger device",
};

/**
 * Runs a DMK device action and resolves with its output.
 *
 * Device actions emit a stream of states and never reject. This bridges them
 * back to a promise, so the handler can keep its `try`/`catch` retry logic, and
 * reports what the device is waiting for as it goes.
 *
 * @param action The device action to run.
 * @param displayMessage Called whenever the device starts waiting on a
 * *different* user interaction.
 */
export async function runDeviceAction<Output>(
  action: DeviceAction<Output>,
  displayMessage: (message: string) => Promise<void>,
): Promise<Output> {
  return await new Promise<Output>((resolve, reject) => {
    let lastInteraction: string | undefined;
    let settled = false;

    // A synchronous observable emits its terminal state *during* the
    // `subscribe` call, before `subscription` is assigned. Unsubscribing is
    // therefore deferred to `settle`, which runs again below once it is bound.
    // eslint-disable-next-line prefer-const -- assigned below, but read by `settle` during a synchronous subscribe
    let subscription: Subscription | undefined;

    const settle = (report: () => void): void => {
      if (settled) {
        return;
      }

      settled = true;
      report();
      subscription?.unsubscribe();
    };

    subscription = action.observable.subscribe({
      next: (state) => {
        switch (state.status) {
          case DeviceActionStatus.Pending: {
            const interaction = state.intermediateValue.requiredUserInteraction;

            if (interaction === "none" || interaction === lastInteraction) {
              return;
            }

            lastInteraction = interaction;

            const message = USER_INTERACTION_MESSAGES[interaction];

            if (message !== undefined) {
              // The message is informational, so a failure to display it must
              // neither fail the device action nor crash the process as an
              // unhandled rejection.
              displayMessage(message).catch(log);
            }

            return;
          }
          case DeviceActionStatus.Completed: {
            settle(() => resolve(state.output));
            return;
          }
          case DeviceActionStatus.Error: {
            settle(() => reject(new LedgerDeviceError(state.error)));
            return;
          }
          case DeviceActionStatus.Stopped: {
            settle(() => reject(new LedgerDeviceActionStoppedError()));
            return;
          }
          case DeviceActionStatus.NotStarted: {
            return;
          }
        }
      },
      // A device action is not supposed to error the observable itself, but we
      // must not hang if it does.
      error: (error: unknown) => {
        settle(() =>
          reject(
            error instanceof Error
              ? error
              : new LedgerDeviceError({
                  _tag: "UnknownDAError",
                  originalError: error,
                }),
          ),
        );
      },
      complete: () => {
        // Completing without a terminal state would leave the promise pending.
        settle(() => reject(new LedgerDeviceActionStoppedError()));
      },
    });

    if (settled) {
      subscription.unsubscribe();
    }
  });
}
