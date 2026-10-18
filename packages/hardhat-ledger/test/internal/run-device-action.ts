import type { DeviceAction } from "../../src/internal/run-device-action.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assertRejects } from "@nomicfoundation/hardhat-test-utils";
import { Observable, of, Subject } from "rxjs";

import { LedgerDeviceActionStoppedError } from "../../src/internal/dmk-errors.js";
import { DeviceActionStatus } from "../../src/internal/dmk-imports.js";
import { runDeviceAction } from "../../src/internal/run-device-action.js";

function toAction<Output>(observable: unknown): DeviceAction<Output> {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- hand-built states
  return { observable, cancel: () => {} } as DeviceAction<Output>;
}

function pendingState(requiredUserInteraction: string) {
  return {
    status: DeviceActionStatus.Pending,
    intermediateValue: { requiredUserInteraction },
  };
}

async function noOpDisplay(): Promise<void> {}

describe("runDeviceAction", () => {
  it("should reject when the action stops or completes without a result", async () => {
    for (const observable of [
      of({ status: DeviceActionStatus.Stopped }),
      of({ status: DeviceActionStatus.NotStarted }),
    ]) {
      await assertRejects(
        runDeviceAction(toAction(observable), noOpDisplay),
        (error) => error instanceof LedgerDeviceActionStoppedError,
        "Expected a LedgerDeviceActionStoppedError",
      );
    }
  });

  it("should reject when the observable itself fails", async () => {
    const states = new Subject<unknown>();
    const running = runDeviceAction(toAction(states), noOpDisplay);

    states.error(new Error("stream failed"));

    await assertRejects(running, (error) => error.message === "stream failed");
  });

  it("should report each new user interaction once", async () => {
    const messages: string[] = [];

    const action = toAction<number>(
      of(
        pendingState("unlock-device"),
        pendingState("none"),
        pendingState("unlock-device"),
        pendingState("unknown-interaction"),
        pendingState("sign-transaction"),
        { status: DeviceActionStatus.Completed, output: 1 },
      ),
    );

    await runDeviceAction(action, async (message) => {
      messages.push(message);
    });

    assert.deepEqual(messages, [
      "Unlock your Ledger device to continue",
      "Review and approve the transaction on your Ledger device",
    ]);
  });

  it("should not fail the action when displaying a message fails", async () => {
    // An unhandled rejection would take the whole process down.
    const unhandledRejections: unknown[] = [];
    const onUnhandledRejection = (reason: unknown) => {
      unhandledRejections.push(reason);
    };

    process.on("unhandledRejection", onUnhandledRejection);

    try {
      const action = toAction<number>(
        of(pendingState("sign-transaction"), {
          status: DeviceActionStatus.Completed,
          output: 7,
        }),
      );

      assert.equal(
        await runDeviceAction(action, async () => {
          throw new Error("display failed");
        }),
        7,
      );

      // Unhandled rejections are only reported once the microtask queue drains.
      await new Promise((resolve) => setImmediate(resolve));

      assert.deepEqual(unhandledRejections, []);
    } finally {
      process.off("unhandledRejection", onUnhandledRejection);
    }
  });

  it("should unsubscribe from an action that is still emitting", async () => {
    let unsubscribed = false;

    const action = toAction<number>(
      new Observable((subscriber) => {
        subscriber.next({ status: DeviceActionStatus.Completed, output: 1 });

        return () => {
          unsubscribed = true;
        };
      }),
    );

    await runDeviceAction(action, noOpDisplay);

    assert.equal(unsubscribed, true);
  });
});
