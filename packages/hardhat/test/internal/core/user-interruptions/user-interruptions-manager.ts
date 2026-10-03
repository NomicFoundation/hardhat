import type { UserInterruptionHooks } from "../../../../src/types/hooks.js";

import assert from "node:assert/strict";
import { PassThrough, Readable } from "node:stream";
import { afterEach, beforeEach, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

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

  describe("default handlers when stdin ends before an answer arrives", () => {
    // The default handlers use process.stdin and process.stdout directly, so
    // we replace them. We save their descriptors instead of reading them, as
    // reading process.stdin initializes it, which can keep the process alive.
    const originalStdinDescriptor = Object.getOwnPropertyDescriptor(
      process,
      "stdin",
    );
    const originalStdoutDescriptor = Object.getOwnPropertyDescriptor(
      process,
      "stdout",
    );

    let stdout: PassThrough;

    // Returns what has been written to stdout since the last call
    function readStdout(): string {
      const output: unknown = stdout.read();
      return output === null ? "" : String(output);
    }

    beforeEach(() => {
      // An input that ends without any data, like `< /dev/null`
      Object.defineProperty(process, "stdin", {
        value: Readable.from([]),
        configurable: true,
        writable: true,
      });

      stdout = new PassThrough();
      Object.defineProperty(process, "stdout", {
        value: stdout,
        configurable: true,
        writable: true,
      });
    });

    afterEach(() => {
      assert(
        originalStdinDescriptor !== undefined,
        "process.stdin descriptor not found",
      );
      assert(
        originalStdoutDescriptor !== undefined,
        "process.stdout descriptor not found",
      );

      Object.defineProperty(process, "stdin", originalStdinDescriptor);
      Object.defineProperty(process, "stdout", originalStdoutDescriptor);
    });

    it("Should reject requestInput with an error", async () => {
      const hre = await HardhatRuntimeEnvironmentImplementation.create({}, {});

      await assertRejectsWithHardhatError(
        hre.interruptions.requestInput(
          "test-interruptor",
          "test-input-description",
        ),
        HardhatError.ERRORS.CORE.GENERAL.PROMPT_CLOSED_BEFORE_ANSWER,
        { interruptor: "test-interruptor" },
      );

      // The error is printed after this, so it has to start on a new line
      assert.ok(
        readStdout().endsWith("test-input-description: \n"),
        "The prompt's line should be ended",
      );
    });

    it("Should reject requestSecretInput with an error", async () => {
      const hre = await HardhatRuntimeEnvironmentImplementation.create({}, {});

      await assertRejectsWithHardhatError(
        hre.interruptions.requestSecretInput(
          "test-interruptor",
          "test-input-description",
        ),
        HardhatError.ERRORS.CORE.GENERAL.PROMPT_CLOSED_BEFORE_ANSWER,
        { interruptor: "test-interruptor" },
      );

      assert.ok(
        readStdout().endsWith("test-input-description: \n"),
        "The prompt's line should be ended",
      );
    });

    it("Should not block later interruptions", async () => {
      const hre = await HardhatRuntimeEnvironmentImplementation.create({}, {});

      await assertRejectsWithHardhatError(
        hre.interruptions.requestSecretInput(
          "test-interruptor",
          "test-input-description",
        ),
        HardhatError.ERRORS.CORE.GENERAL.PROMPT_CLOSED_BEFORE_ANSWER,
        { interruptor: "test-interruptor" },
      );

      const handlers: Partial<UserInterruptionHooks> = {
        async requestInput() {
          return "test-input";
        },
      };

      hre.hooks.registerHandlers("userInterruptions", handlers);

      const input = await hre.interruptions.requestInput(
        "test-interruptor",
        "test-input-description",
      );

      assert.equal(input, "test-input");
    });

    it("Should reject a later prompt after stdin has already ended", async () => {
      const hre = await HardhatRuntimeEnvironmentImplementation.create({}, {});

      await assertRejectsWithHardhatError(
        hre.interruptions.requestSecretInput(
          "test-interruptor",
          "test-input-description",
        ),
        HardhatError.ERRORS.CORE.GENERAL.PROMPT_CLOSED_BEFORE_ANSWER,
        { interruptor: "test-interruptor" },
      );

      readStdout();

      await assertRejectsWithHardhatError(
        hre.interruptions.requestInput(
          "test-interruptor",
          "test-input-description",
        ),
        HardhatError.ERRORS.CORE.GENERAL.PROMPT_CLOSED_BEFORE_ANSWER,
        { interruptor: "test-interruptor" },
      );

      // The second prompt is never shown, so there's no line to end
      assert.equal(readStdout(), "");
    });
  });
});
