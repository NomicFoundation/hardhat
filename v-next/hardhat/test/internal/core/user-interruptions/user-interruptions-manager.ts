import type { UserInterruptionHooks } from "../../../../src/types/hooks.js";
import type { BatchedUserInterruptionManager } from "../../../../src/types/user-interruptions.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatRuntimeEnvironmentImplementation } from "../../../../src/internal/core/hre.js";

describe("UserInterruptionManager", () => {
  describe("displayMessage", () => {
    it("Should call a dynamic handler with a given message from an interruptor", async () => {
      const hre = await HardhatRuntimeEnvironmentImplementation.create({}, {});

      let called = false;
      let givenInterruptor: string = "";
      let givenMessage: string = "";

      const handlers: Partial<UserInterruptionHooks> = {
        async displayMessage(_context, interruptor, message) {
          called = true;
          givenInterruptor = interruptor;
          givenMessage = message;
        },
      };

      hre.hooks.registerHandlers("userInterruptions", handlers);

      await hre.interruptions.displayMessage(
        "test-interruptor",
        "test-message",
      );

      assert(called, "Handler was not called");
      assert.equal(givenInterruptor, "test-interruptor");
      assert.equal(givenMessage, "test-message");
    });
  });

  describe("requestInput", () => {
    it("Should call a dynamic handler with a given input description from an interruptor", async () => {
      const hre = await HardhatRuntimeEnvironmentImplementation.create({}, {});

      let called = false;
      let givenInterruptor: string = "";
      let givenInputDescription: string = "";

      const handlers: Partial<UserInterruptionHooks> = {
        async requestInput(_context, interruptor, inputDescription) {
          called = true;
          givenInterruptor = interruptor;
          givenInputDescription = inputDescription;
          return "test-input";
        },
      };

      hre.hooks.registerHandlers("userInterruptions", handlers);

      const input = await hre.interruptions.requestInput(
        "test-interruptor",
        "test-input-description",
      );

      assert(called, "Handler was not called");
      assert.equal(givenInterruptor, "test-interruptor");
      assert.equal(givenInputDescription, "test-input-description");
      assert.equal(input, "test-input");
    });
  });

  describe("requestSecretInput", () => {
    it("Should call a dynamic handler with a given input description from an interruptor", async () => {
      const hre = await HardhatRuntimeEnvironmentImplementation.create({}, {});

      let called = false;
      let givenInterruptor: string = "";
      let givenInputDescription: string = "";

      const handlers: Partial<UserInterruptionHooks> = {
        async requestSecretInput(_context, interruptor, inputDescription) {
          called = true;
          givenInterruptor = interruptor;
          givenInputDescription = inputDescription;
          return "test-secret-input";
        },
      };

      hre.hooks.registerHandlers("userInterruptions", handlers);

      const input = await hre.interruptions.requestSecretInput(
        "test-interruptor",
        "test-input-description",
      );

      assert(called, "Handler was not called");
      assert.equal(givenInterruptor, "test-interruptor");
      assert.equal(givenInputDescription, "test-input-description");
      assert.equal(input, "test-secret-input");
    });
  });

  describe("withBatchedInterruptions", () => {
    it("Should call multiple interruption methods within a single callback without deadlocking", async () => {
      const hre = await HardhatRuntimeEnvironmentImplementation.create({}, {});

      const calls: Array<{ method: string; interruptor: string; arg: string }> =
        [];

      const handlers: Partial<UserInterruptionHooks> = {
        async displayMessage(_context, interruptor, message) {
          calls.push({
            method: "displayMessage",
            interruptor,
            arg: message,
          });
        },
        async requestInput(_context, interruptor, inputDescription) {
          calls.push({
            method: "requestInput",
            interruptor,
            arg: inputDescription,
          });
          return "batched-input";
        },
        async requestSecretInput(_context, interruptor, inputDescription) {
          calls.push({
            method: "requestSecretInput",
            interruptor,
            arg: inputDescription,
          });
          return "batched-secret";
        },
      };

      hre.hooks.registerHandlers("userInterruptions", handlers);

      await hre.interruptions.withBatchedInterruptions(
        async (interruptions: BatchedUserInterruptionManager) => {
          await interruptions.displayMessage("batch-test", "hello");
          const input = await interruptions.requestInput(
            "batch-test",
            "enter value",
          );
          assert.equal(input, "batched-input");
          const secret = await interruptions.requestSecretInput(
            "batch-test",
            "enter secret",
          );
          assert.equal(secret, "batched-secret");
        },
      );

      assert.deepEqual(calls, [
        {
          method: "displayMessage",
          interruptor: "batch-test",
          arg: "hello",
        },
        {
          method: "requestInput",
          interruptor: "batch-test",
          arg: "enter value",
        },
        {
          method: "requestSecretInput",
          interruptor: "batch-test",
          arg: "enter secret",
        },
      ]);
    });

    it("Should return the callback's return value", async () => {
      const hre = await HardhatRuntimeEnvironmentImplementation.create({}, {});

      const result = await hre.interruptions.withBatchedInterruptions(
        async (_interruptions: BatchedUserInterruptionManager) => {
          return 42;
        },
      );

      assert.equal(result, 42);
    });
  });
});
