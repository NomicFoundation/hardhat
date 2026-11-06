import type { UserInterruptionHooks } from "../../../../src/types/hooks.js";

import assert from "node:assert/strict";
import { PassThrough, Readable } from "node:stream";
import { afterEach, beforeEach, describe, it } from "node:test";
import { setImmediate } from "node:timers/promises";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { HardhatRuntimeEnvironmentImplementation } from "../../../../src/internal/core/hre.js";

// The default handlers use process.stdin and process.stdout directly, so the
// tests below replace them. We save their descriptors instead of reading them,
// as reading process.stdin initializes it, which can keep the process alive.
const originalStdinDescriptor = Object.getOwnPropertyDescriptor(
  process,
  "stdin",
);
const originalStdoutDescriptor = Object.getOwnPropertyDescriptor(
  process,
  "stdout",
);

let stdout: PassThrough;

function replaceStdio(stdin: Readable, stdoutIsTTY = false): void {
  Object.defineProperty(process, "stdin", {
    value: stdin,
    configurable: true,
    writable: true,
  });

  stdout = Object.assign(new PassThrough(), { isTTY: stdoutIsTTY });
  Object.defineProperty(process, "stdout", {
    value: stdout,
    configurable: true,
    writable: true,
  });
}

function restoreStdio(): void {
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
}

// Returns what has been written to stdout since the last call. Since Node
// 26, `read()` returns a single chunk instead of the whole buffer.
function readStdout(): string {
  let output = "";

  for (
    let chunk: unknown = stdout.read();
    chunk !== null;
    chunk = stdout.read()
  ) {
    output += String(chunk);
  }

  return output;
}

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
    beforeEach(() => {
      // An input that ends without any data, like `< /dev/null`
      replaceStdio(Readable.from([]));
    });

    afterEach(restoreStdio);

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

  describe("default handlers when the answers are piped", () => {
    // The default handlers buffer the piped answers in module state, so the
    // ones a failing test leaves unread would be read by the next test
    afterEach(async function drainBufferedAnswers() {
      replaceStdio(Readable.from([]));
      const hre = await HardhatRuntimeEnvironmentImplementation.create({}, {});

      try {
        // Once the buffer is empty the prompt reads stdin, which has ended
        while (true) {
          await hre.interruptions.requestInput("test-interruptor", "drain");
        }
      } catch (error) {
        if (
          !HardhatError.isHardhatError(
            error,
            HardhatError.ERRORS.CORE.GENERAL.PROMPT_CLOSED_BEFORE_ANSWER,
          )
        ) {
          throw error;
        }
      } finally {
        restoreStdio();
      }
    });

    // Every prompt is shown, even when its answer was already read by a
    // previous prompt, and the piped answers are never echoed
    function assertPromptsShown(
      output: string,
      inputDescriptions: string[],
    ): void {
      for (const inputDescription of inputDescriptions) {
        assert.ok(
          output.includes(`${inputDescription}: `),
          `The prompt for ${inputDescription} should be shown`,
        );
      }

      assert.ok(!output.includes("answer"), "The answers should not be echoed");
    }

    // In terminal mode readline drops the lines after the first answer, so
    // stdout being a terminal must not put it in that mode
    for (const stdoutIsTTY of [false, true]) {
      describe(`when stdout.isTTY is ${stdoutIsTTY}`, () => {
        it("Should answer consecutive prompts from a single chunk", async () => {
          // Piped input usually arrives in a single chunk
          replaceStdio(
            Readable.from(["first-answer\nsecret-answer\nsecond-answer\n"]),
            stdoutIsTTY,
          );
          const hre = await HardhatRuntimeEnvironmentImplementation.create(
            {},
            {},
          );

          assert.equal(
            await hre.interruptions.requestInput(
              "test-interruptor",
              "first-input",
            ),
            "first-answer",
          );
          assert.equal(
            await hre.interruptions.requestSecretInput(
              "test-interruptor",
              "secret-input",
            ),
            "secret-answer",
          );
          assert.equal(
            await hre.interruptions.requestInput(
              "test-interruptor",
              "second-input",
            ),
            "second-answer",
          );

          assertPromptsShown(readStdout(), [
            "first-input",
            "secret-input",
            "second-input",
          ]);
        });

        it("Should keep the piped answers when the first prompt is secret", async () => {
          replaceStdio(
            Readable.from(["secret-answer\nfirst-answer\nsecond-answer\n"]),
            stdoutIsTTY,
          );
          const hre = await HardhatRuntimeEnvironmentImplementation.create(
            {},
            {},
          );

          assert.equal(
            await hre.interruptions.requestSecretInput(
              "test-interruptor",
              "secret-input",
            ),
            "secret-answer",
          );
          assert.equal(
            await hre.interruptions.requestInput(
              "test-interruptor",
              "first-input",
            ),
            "first-answer",
          );
          assert.equal(
            await hre.interruptions.requestInput(
              "test-interruptor",
              "second-input",
            ),
            "second-answer",
          );

          assertPromptsShown(readStdout(), [
            "secret-input",
            "first-input",
            "second-input",
          ]);
        });

        it("Should answer prompts from answers piped in several chunks", async () => {
          const stdin = new PassThrough();
          replaceStdio(stdin, stdoutIsTTY);
          const hre = await HardhatRuntimeEnvironmentImplementation.create(
            {},
            {},
          );

          stdin.write("first-answer\n");
          assert.equal(
            await hre.interruptions.requestInput(
              "test-interruptor",
              "first-input",
            ),
            "first-answer",
          );

          const secret = hre.interruptions.requestSecretInput(
            "test-interruptor",
            "secret-input",
          );

          // The next chunk is only written once the second prompt is waiting
          // for it
          await setImmediate();
          const output = readStdout();
          assert.ok(
            output.endsWith("secret-input: "),
            "The second prompt should be waiting for input",
          );
          stdin.end("secret-answer\nsecond-answer\n");

          assert.equal(await secret, "secret-answer");
          assert.equal(
            await hre.interruptions.requestInput(
              "test-interruptor",
              "second-input",
            ),
            "second-answer",
          );

          assertPromptsShown(output + readStdout(), [
            "first-input",
            "secret-input",
            "second-input",
          ]);
        });
      });
    }
  });
});
