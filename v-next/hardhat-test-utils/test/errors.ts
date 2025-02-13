import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ensureError } from "@ignored/hardhat-vnext-utils/error";

import { assertRejects, assertThrows } from "../src/errors.js";

describe("errors", () => {
  describe("assertRejects", () => {
    it("Should throw if the operation does not throw", async () => {
      try {
        await assertRejects(async () => {});
      } catch (error) {
        return;
      }

      assert.fail("Function did not throw any error");
    });

    it("Should pass if the operation throws and no condition is provided", async () => {
      await assertRejects(async () => {
        throw new Error("foo");
      });
    });

    it("should pass if the condition is met", async () => {
      await assertRejects(
        async () => {
          throw new Error("foo");
        },
        (error) => error.message === "foo",
      );
    });

    it("should fail if the condition is not met", async () => {
      try {
        await assertRejects(
          async () => {
            throw new Error("foo");
          },
          (error) => error.message === "bar",
          "Condition for error not met",
        );
      } catch {
        return;
      }

      assert.fail("Function did not throw any error");
    });

    it("should fail if the rejections is not an error", async () => {
      try {
        await assertRejects(async () => {
          // eslint-disable-next-line no-throw-literal -- Intentional for the test
          throw "foo";
        });
      } catch {
        return;
      }

      assert.fail("Function did not throw any error");
    });

    it("Should use the custom error message if provided", async () => {
      try {
        await assertRejects(
          async () => {
            throw new Error("foo");
          },
          (error) => error.message === "bar",
          "Custom error message",
        );
      } catch (error) {
        ensureError(error);
        assert.equal(
          error.message,
          "Custom error message",
          "Custom error message should be used",
        );
        return;
      }

      throw new Error("Function did not throw any error");
    });
  });

  describe("assertThrows", () => {
    it("Should pass if the function throws an error", async () => {
      assertThrows(() => {
        throw new Error("foo");
      });
    });

    it("Should pass if the condition is met", async () => {
      assertThrows(
        () => {
          throw new Error("foo");
        },
        (error) => error.message === "foo",
      );
    });

    it("Should fail if the condition is not met", async () => {
      try {
        assertThrows(
          () => {
            throw new Error("foo");
          },
          (error) => error.message === "bar",
        );
      } catch (error) {
        return;
      }

      assert.fail("Function did not throw any error");
    });

    it("Should use the correct error message if provided", async () => {
      try {
        assertThrows(
          () => {
            throw new Error("foo");
          },
          (error) => error.message === "bar",
          "Custom error message",
        );
      } catch (error) {
        ensureError(error);
        assert.equal(
          error.message,
          "Custom error message",
          "Custom error message should be used",
        );
        return;
      }

      assert.fail("Function did not throw any error");
    });

    it("Should fail if the value thrown is not an error", async () => {
      try {
        assertThrows(() => {
          // eslint-disable-next-line no-throw-literal -- Intentional for the test
          throw "foo";
        });
      } catch (error) {
        return;
      }

      assert.fail("Function did not throw any error");
    });
  });
});
