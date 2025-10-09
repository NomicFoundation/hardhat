import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

import {
  assertIsHardhatError,
  assertThrowsHardhatError,
  assertRejectsWithHardhatError,
} from "../src/hardhat-error.js";

describe("HardhatError helpers", () => {
  describe("assertIsHardhatError", () => {
    it("should throw if the error is not a HardhatError", () => {
      assert.throws(() => {
        assertIsHardhatError(
          new Error("Not a HardhatError"),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.INVALID_ACTION,
          { task: "bar" },
        );
      });

      assert.throws(() => {
        assertIsHardhatError(
          123,
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.INVALID_ACTION,
          { task: "bar" },
        );
      });
    });

    it("should throw if the error has a different descriptor", () => {
      assert.throws(() => {
        assertIsHardhatError(
          new HardhatError(
            HardhatError.ERRORS.CORE.TASK_DEFINITIONS.UNRECOGNIZED_TASK_OPTION,
            { option: "foo", task: "bar" },
          ),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.INVALID_ACTION,
          { task: "bar" },
        );
      });
    });

    it("should throw if the error has different message arguments", () => {
      assert.throws(() => {
        assertIsHardhatError(
          new HardhatError(
            HardhatError.ERRORS.CORE.TASK_DEFINITIONS.UNRECOGNIZED_TASK_OPTION,
            { option: "foo", task: "bar" },
          ),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.UNRECOGNIZED_TASK_OPTION,
          { option: "foo2", task: "bar" },
        );
      });
    });

    describe("Error cause", () => {
      it("Should not throw if the error cause is provided and its the same", () => {
        const cause = new Error("cause");

        assertIsHardhatError(
          new HardhatError(
            HardhatError.ERRORS.CORE.TASK_DEFINITIONS.UNRECOGNIZED_TASK_OPTION,
            { option: "foo", task: "bar" },
            cause,
          ),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.UNRECOGNIZED_TASK_OPTION,
          { option: "foo", task: "bar" },
          cause,
        );
      });

      it("Should throw if a cause is provided and doesn't match the error cause (by reference)", () => {
        assert.throws(() => {
          assertIsHardhatError(
            new HardhatError(
              HardhatError.ERRORS.CORE.TASK_DEFINITIONS.UNRECOGNIZED_TASK_OPTION,
              { option: "foo", task: "bar" },
              new Error("cause"),
            ),
            HardhatError.ERRORS.CORE.TASK_DEFINITIONS.UNRECOGNIZED_TASK_OPTION,
            { option: "foo", task: "bar" },
            new Error("cause"),
          );
        });
      });

      it("Should throw if the cause is provided but there's none", () => {
        assert.throws(() => {
          assertIsHardhatError(
            new HardhatError(
              HardhatError.ERRORS.CORE.TASK_DEFINITIONS.UNRECOGNIZED_TASK_OPTION,
              { option: "foo", task: "bar" },
            ),
            HardhatError.ERRORS.CORE.TASK_DEFINITIONS.UNRECOGNIZED_TASK_OPTION,
            { option: "foo", task: "bar" },
            new Error("cause"),
          );
        });
      });
    });
  });

  describe("assertThrowsHardhatError", () => {
    it("should throw if the function does not throw", () => {
      assert.throws(() => {
        assertThrowsHardhatError(
          () => {},
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.INVALID_ACTION,
          { task: "bar" },
        );
      });
    });

    it("asserts the error that was thrown", () => {
      assert.throws(() =>
        assertThrowsHardhatError(
          () => {
            throw new HardhatError(
              HardhatError.ERRORS.CORE.TASK_DEFINITIONS.UNRECOGNIZED_TASK_OPTION,
              { option: "foo", task: "bar" },
            );
          },
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.UNRECOGNIZED_TASK_OPTION,
          { option: "foo2", task: "bar" },
        ),
      );

      assertThrowsHardhatError(
        () => {
          throw new HardhatError(
            HardhatError.ERRORS.CORE.TASK_DEFINITIONS.UNRECOGNIZED_TASK_OPTION,
            { option: "foo", task: "bar" },
          );
        },
        HardhatError.ERRORS.CORE.TASK_DEFINITIONS.UNRECOGNIZED_TASK_OPTION,
        { option: "foo", task: "bar" },
      );
    });

    it("asserts the cause", () => {
      assert.throws(() => {
        assertThrowsHardhatError(
          () => {
            throw new HardhatError(
              HardhatError.ERRORS.CORE.TASK_DEFINITIONS.UNRECOGNIZED_TASK_OPTION,
              { option: "foo", task: "bar" },
              new Error("cause"),
            );
          },

          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.UNRECOGNIZED_TASK_OPTION,
          { option: "foo", task: "bar" },
          new Error("cause"),
        );
      });
    });
  });

  describe("assertRejectsWithHardhatError", () => {
    it("should throw if the function doesn't return a promise that rejects", async () => {
      await assert.rejects(async () =>
        assertRejectsWithHardhatError(
          async () => {},
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.INVALID_ACTION,
          { task: "bar" },
        ),
      );
    });

    it("should throw the promise that rejects", async () => {
      await assert.rejects(async () =>
        assertRejectsWithHardhatError(
          Promise.resolve(1),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.INVALID_ACTION,
          { task: "bar" },
        ),
      );
    });

    it("asserts the error of the rejection", async () => {
      await assert.rejects(() =>
        assertRejectsWithHardhatError(
          async () => {
            throw new HardhatError(
              HardhatError.ERRORS.CORE.TASK_DEFINITIONS.UNRECOGNIZED_TASK_OPTION,
              { option: "foo", task: "bar" },
            );
          },
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.UNRECOGNIZED_TASK_OPTION,
          { option: "foo2", task: "bar" },
        ),
      );

      await assert.rejects(() =>
        assertRejectsWithHardhatError(
          Promise.reject(
            new HardhatError(
              HardhatError.ERRORS.CORE.TASK_DEFINITIONS.UNRECOGNIZED_TASK_OPTION,
              { option: "foo", task: "bar" },
            ),
          ),
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.UNRECOGNIZED_TASK_OPTION,
          { option: "foo2", task: "bar" },
        ),
      );

      await assertRejectsWithHardhatError(
        async () => {
          throw new HardhatError(
            HardhatError.ERRORS.CORE.TASK_DEFINITIONS.UNRECOGNIZED_TASK_OPTION,
            { option: "foo", task: "bar" },
          );
        },
        HardhatError.ERRORS.CORE.TASK_DEFINITIONS.UNRECOGNIZED_TASK_OPTION,
        { option: "foo", task: "bar" },
      );
    });

    it("asserts the cause", async () => {
      await assert.rejects(async () => {
        await assertRejectsWithHardhatError(
          async () => {
            throw new HardhatError(
              HardhatError.ERRORS.CORE.TASK_DEFINITIONS.UNRECOGNIZED_TASK_OPTION,
              { option: "foo", task: "bar" },
              new Error("cause"),
            );
          },
          HardhatError.ERRORS.CORE.TASK_DEFINITIONS.UNRECOGNIZED_TASK_OPTION,
          { option: "foo", task: "bar" },
          new Error("cause"),
        );
      });
    });
  });
});
