import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HookManagerImplementation } from "../../../src/internal/hook-manager.js";
import { UserInterruptionManagerImplementation } from "../../../src/internal/user-interruptions.js";
import { UserInterruptionHooks } from "../../../src/types/hooks.js";

describe("UserInterruptionManager", () => {
  describe("displayMessage", () => {
    it("Should call a dynamic handler with a given message from an interruptor", async () => {
      const hookManager = new HookManagerImplementation([]);
      const userInterruptionManager = new UserInterruptionManagerImplementation(
        hookManager,
      );
      hookManager.setContext({} as any);

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

      hookManager.registerHandlers("userInterruptions", handlers);

      await userInterruptionManager.displayMessage(
        "test-interruptor",
        "test-message",
      );

      assert(called);
      assert.equal(givenInterruptor, "test-interruptor");
      assert.equal(givenMessage, "test-message");
    });
  });

  describe("requestInput", () => {
    it("Should call a dynamic handler with a given input description from an interruptor", async () => {
      const hookManager = new HookManagerImplementation([]);
      const userInterruptionManager = new UserInterruptionManagerImplementation(
        hookManager,
      );
      hookManager.setContext({} as any);

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

      hookManager.registerHandlers("userInterruptions", handlers);

      const input = await userInterruptionManager.requestInput(
        "test-interruptor",
        "test-input-description",
      );

      assert(called);
      assert.equal(givenInterruptor, "test-interruptor");
      assert.equal(givenInputDescription, "test-input-description");
      assert.equal(input, "test-input");
    });
  });

  describe("requestSecretInput", () => {
    it("Should call a dynamic handler with a given input description from an interruptor", async () => {
      const hookManager = new HookManagerImplementation([]);
      const userInterruptionManager = new UserInterruptionManagerImplementation(
        hookManager,
      );
      hookManager.setContext({} as any);

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

      hookManager.registerHandlers("userInterruptions", handlers);

      const input = await userInterruptionManager.requestSecretInput(
        "test-interruptor",
        "test-input-description",
      );

      assert(called);
      assert.equal(givenInterruptor, "test-interruptor");
      assert.equal(givenInputDescription, "test-input-description");
      assert.equal(input, "test-secret-input");
    });
  });
});
