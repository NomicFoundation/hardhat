import type { DmkError, ExecuteDeviceActionReturnType } from "./dmk-imports.js";

import { createDebug } from "@nomicfoundation/hardhat-utils/debug";
import { takeWhile } from "rxjs";

import {
  LedgerDeviceActionStoppedError,
  LedgerDeviceError,
} from "./dmk-errors.js";
import { DeviceActionStatus } from "./dmk-imports.js";

const log = createDebug("hardhat:ledger:run-device-action");

/** A DMK device action with the generic error type, which is easy to mock. */
export type DeviceAction<Output> = ExecuteDeviceActionReturnType<
  Output,
  DmkError,
  IntermediateValue
>;

interface IntermediateValue {
  readonly requiredUserInteraction: string;
}

/** Messages for each user interaction reported by the DMK. */
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
 * Runs a DMK device action as a promise and reports new user interactions.
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

    const settle = (report: () => void): void => {
      if (settled) {
        return;
      }

      settled = true;

      report();
    };

    // Completing on the first terminal state unsubscribes from the source.
    const states = action.observable.pipe(
      takeWhile(
        (state) =>
          state.status === DeviceActionStatus.Pending ||
          state.status === DeviceActionStatus.NotStarted,
        true,
      ),
    );

    states.subscribe({
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
              // Display failures must not fail the action or go unhandled.
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
      // An unexpected observable error must not leave the promise pending.
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
        // Completion without a terminal state must not leave the promise pending.
        settle(() => reject(new LedgerDeviceActionStoppedError()));
      },
    });
  });
}
